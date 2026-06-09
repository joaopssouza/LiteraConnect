export type GenreHierarchy = {
  [mainGenre: string]: string[];
};

export const GENRE_HIERARCHY: GenreHierarchy = {
  "Artes": [
    "Arquitetura",
    "Artes Performáticas",
    "Cinema e TV",
    "Design e Artes Decorativas",
    "Fotografia",
    "História e Crítica da Arte",
    "Música"
  ],
  "Autoajuda": [
    "Criatividade",
    "Desenvolvimento Pessoal",
    "Felicidade",
    "Gestão de Estresse",
    "Motivação",
    "Relacionamentos",
    "Sucesso e Carreira"
  ],
  "Biografias e memórias": [
    "Artes e Entretenimento",
    "Figuras Históricas",
    "Líderes e Notáveis",
    "Memórias Pessoais",
    "Profissionais e Acadêmicos",
    "Verdadeiro Crime (True Crime)"
  ],
  "Educação": [
    "Dicionários e Idiomas",
    "Ensino Fundamental e Médio",
    "Ensino Superior",
    "Material Didático e Métodos de Estudo",
    "Pedagogia e Políticas Educacionais"
  ],
  "Ficção científica e fantasia": [
    "Aventura Espacial",
    "Cyberpunk",
    "Distopia",
    "Fantasia Épica / Alta Fantasia",
    "Fantasia Urbana",
    "Ficção Científica Hard",
    "Viagem no Tempo"
  ],
  "Ficção e literatura": [
    "Clássicos",
    "Contos e Antologias",
    "Drama e Peças Teatrais",
    "Ficção Contemporânea",
    "Ficção Histórica",
    "Realismo Mágico"
  ],
  "Gastronomia e vinhos": [
    "Bebidas e Coquetelaria",
    "Culinária Internacional",
    "Culinária Regional",
    "Dietas Especiais e Saudáveis",
    "Ingredientes Específicos",
    "Refeições Rápidas",
    "Sobremesas e Confeitaria"
  ],
  "História": [
    "Antiguidade",
    "História da América",
    "História da Ásia e África",
    "História da Europa",
    "História do Brasil",
    "História Militar",
    "Idade Média",
    "Idade Moderna e Contemporânea"
  ],
  "Humor": [
    "Ensaios Humorísticos",
    "Humor Gráfico e Quadrinhos",
    "Paródias",
    "Sátiras"
  ],
  "Livros infantis": [
    "Animais",
    "Aventura",
    "Contos de Fadas, Folclore e Lendas",
    "Educação e Conceitos Básicos",
    "Esportes e Recreação",
    "Mistério e Detetive",
    "Não Ficção para Crianças"
  ],
  "Mistério e suspense": [
    "Detetives Particulares",
    "Espionagem",
    "Policial e Procedimental",
    "Suspense Psicológico",
    "Thrillers de Ação e Suspense"
  ],
  "Negócios e investimentos": [
    "Administração e Liderança",
    "Economia",
    "Empreendedorismo",
    "Finanças Pessoais",
    "Marketing e Vendas",
    "Recursos Humanos"
  ],
  "Poesia": [
    "Antologias Poéticas",
    "Poesia Brasileira",
    "Poesia Clássica",
    "Poesia Contemporânea",
    "Poesia Épica"
  ],
  "Psicologia": [
    "Desenvolvimento Humano",
    "Movimentos e Correntes",
    "Neuropsicologia",
    "Psicanálise",
    "Psicologia Clínica e Aplicada",
    "Psicologia Cognitiva"
  ],
  "Religião e espiritualidade": [
    "Budismo",
    "Cristianismo",
    "Esoterismo e Ocultismo",
    "Espiritismo",
    "Islamismo",
    "Judaísmo",
    "Meditação e Nova Era"
  ],
  "Romances": [
    "Comédia Romântica",
    "Romance Contemporâneo",
    "Romance Erótico (New Adult)",
    "Romance Histórico",
    "Romance Paranormal e Fantasia Romântica",
    "Romance LGBTQIA+"
  ],
  "Saúde, mente e corpo": [
    "Bem-estar e Equilíbrio",
    "Dietas e Nutrição",
    "Doenças e Tratamentos",
    "Exercícios e Fitness",
    "Medicina Alternativa e Terapias",
    "Saúde Mental"
  ]
};

/**
 * Função utilitária para descobrir os Gêneros Principais a partir de uma lista de Subgêneros
 */
export function getMainGenresFromSubgenres(subgenres: string[]): string[] {
  const mainGenres = new Set<string>();
  
  for (const sub of subgenres) {
    for (const [main, subs] of Object.entries(GENRE_HIERARCHY)) {
      if (subs.includes(sub)) {
        mainGenres.add(main);
        break;
      }
    }
  }
  
  return Array.from(mainGenres);
}

/**
 * Função utilitária para obter todos os subgêneros de um conjunto de categorias principais
 */
export function getSubgenresForMainGenres(mainGenres: string[]): string[] {
  const subs: string[] = [];
  for (const main of mainGenres) {
    if (GENRE_HIERARCHY[main]) {
      subs.push(...GENRE_HIERARCHY[main]);
    }
  }
  return subs;
}
