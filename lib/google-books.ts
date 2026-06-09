import clientPromise from './mongodb';
import { connectRedis } from './redis';

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

export interface GoogleBookVolumeInfo {
  title: string;
  subtitle?: string;
  authors?: string[];
  description?: string;
  industryIdentifiers?: { type: string; identifier: string }[];
  categories?: string[];
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
  };
  language?: string;
  averageRating?: number;
  ratingsCount?: number;
  pageCount?: number;
  publishedDate?: string;
}

export interface GoogleBookItem {
  id: string;
  volumeInfo: GoogleBookVolumeInfo;
}

export interface BookCatalogEntry {
  _id: string; // Utilizaremos o ID externo do Google Books como _id para evitar duplicação
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  thumbnail?: string;
  isbn?: string;
  categories: string[];
  language?: string;
  averageRating?: number;
  ratingsCount?: number;
  pageCount?: number;
  publishedDate?: string;
  updatedAt: Date;
}

export class GoogleBooksService {
  private static get apiKey() {
    return process.env.GOOGLE_BOOKS_API_KEY;
  }

  /**
   * Busca livros genéricos por termo de pesquisa (usado na Busca Híbrida).
   */
  static async searchBooks(query: string, maxResults = 10): Promise<BookCatalogEntry[]> {
    if (!this.apiKey) {
      console.warn('GOOGLE_BOOKS_API_KEY não configurada.');
      return [];
    }
    
    const url = `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(query)}&maxResults=${maxResults}&orderBy=relevance&key=${this.apiKey}&langRestrict=pt`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha na API externa');
      const data = await response.json();
      if (!data.items) return [];
      return data.items.map(this.mapToCatalogEntry).filter(Boolean) as BookCatalogEntry[];
    } catch (error) {
      console.error(`Erro na busca externa para "${query}":`, error);
      return [];
    }
  }

  /**
   * Busca livros mais populares de uma categoria específica.
   */
  static async fetchPopularByCategory(category: string, maxResults = 40, startIndex = 0): Promise<BookCatalogEntry[]> {
    if (!this.apiKey) {
      console.warn('GOOGLE_BOOKS_API_KEY não está configurada no ambiente.');
      return [];
    }

    const categoryLower = category.toLowerCase();
    let searchQuery = `livros de ${category}`;
    
    const categoryMap: Record<string, string> = {
      'fiction': 'Ficção',
      'romance': 'Romance',
      'fantasy': 'Fantasia',
      'science fiction': 'Ficção Científica',
      'thriller': 'Suspense',
      'mystery': 'Mistério',
      'young adult': 'Ficção juvenil',
      'horror': 'Terror',
      'biography': 'Biografia',
      'self-help': 'Autoajuda'
    };

    if (categoryMap[categoryLower]) {
      searchQuery = `livros de ${categoryMap[categoryLower]}`;
    }

    const query = encodeURIComponent(searchQuery);
    // Ordenando por relevância para obter os "melhores/mais populares"
    const url = `${GOOGLE_BOOKS_API_URL}?q=${query}&orderBy=relevance&maxResults=${maxResults}&startIndex=${startIndex}&key=${this.apiKey}&langRestrict=pt`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Books API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.items) return [];

      return data.items.map(this.mapToCatalogEntry).filter(Boolean) as BookCatalogEntry[];
    } catch (error) {
      console.error(`Erro ao buscar livros para categoria ${category}:`, error);
      return [];
    }
  }

  /**
   * Mapeia a resposta da API do Google para a nossa estrutura de banco de dados.
   */
  private static mapToCatalogEntry(item: GoogleBookItem): BookCatalogEntry | null {
    if (!item.volumeInfo || !item.volumeInfo.title) return null;

    const { volumeInfo } = item;
    
    // Filtro estrito para Português (Brasil ou genérico)
    if (volumeInfo.language && !volumeInfo.language.toLowerCase().startsWith('pt')) return null;

    // Tenta encontrar um ISBN
    const isbnObj = volumeInfo.industryIdentifiers?.find(
      (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10'
    );

    // Extrai a capa com prioridade para thumbnail
    const thumbnail = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail;

    return {
      _id: item.id,
      title: volumeInfo.title,
      subtitle: volumeInfo.subtitle,
      authors: volumeInfo.authors || [],
      description: volumeInfo.description,
      thumbnail: thumbnail ? thumbnail.replace('http:', 'https:') : undefined, // Assegura HTTPS
      isbn: isbnObj?.identifier,
      categories: volumeInfo.categories || [],
      language: volumeInfo.language,
      averageRating: volumeInfo.averageRating || 0,
      ratingsCount: volumeInfo.ratingsCount || 0,
      pageCount: volumeInfo.pageCount,
      publishedDate: volumeInfo.publishedDate,
      updatedAt: new Date(),
    };
  }

  /**
   * Realiza o upsert de livros na coleção local do MongoDB e salva o top 10 no Redis
   * para acesso em sub-milissegundo durante o fluxo de onboarding.
   */
  static async syncCategoryCatalog(category: string): Promise<void> {
    const books = await this.fetchPopularByCategory(category, 15); // Buscando 15 para ter margem
    if (books.length === 0) return;

    try {
      // 1. Persistência no MongoDB Local (books_catalog)
      const mongoClient = await clientPromise;
      const db = mongoClient.db(process.env.MONGODB_DB || 'literaconnect');
      const collection = db.collection<BookCatalogEntry>('books_catalog');

      // Executa upsert em massa
      const bulkOps = books.map((book) => ({
        updateOne: {
          filter: { _id: book._id },
          update: { $set: book },
          upsert: true,
        },
      }));

      await collection.bulkWrite(bulkOps, { ordered: false });

      // 2. Injeção de Alta Performance no Redis (Onboarding Cache)
      // O Redis salvará uma string JSON dos TOP 10 da categoria
      const redis = await connectRedis();
      if (redis.isOpen) {
        const topBooks = books.slice(0, 10);
        const cacheKey = `onboarding:category:${category.toLowerCase()}`;
        
        // TTL longo (7 dias) para aguentar sem atualizações externas frequentes
        await redis.set(cacheKey, JSON.stringify(topBooks), { EX: 60 * 60 * 24 * 7 });
      }

      console.log(`[GoogleBooksService] Sincronizados ${books.length} livros para a categoria '${category}'.`);
    } catch (error) {
      console.error('[GoogleBooksService] Erro ao sincronizar catálogo local:', error);
    }
  }
}
