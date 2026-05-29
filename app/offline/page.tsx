import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sem conexão — LiteraConnect',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-brand-5">
      <div className="text-6xl mb-6" role="img" aria-label="Livro fechado">
        📚
      </div>
      <h1 className="text-3xl font-serif font-bold text-brand-1 mb-3">Você está offline</h1>
      <p className="text-brand-1/60 max-w-sm mb-8 leading-relaxed">
        Parece que não há conexão com a internet. Volte quando estiver conectado para ver as últimas resenhas.
      </p>
      <Link
        href="/"
        className="bg-brand-3 text-white px-8 py-3 rounded-full font-medium hover:bg-brand-2 transition-colors"
      >
        Tentar novamente
      </Link>
    </div>
  );
}
