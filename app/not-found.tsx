import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <h2 className="text-4xl font-serif font-bold text-brand-1 mb-4">404</h2>
      <p className="text-brand-1/60 mb-8">Página não encontrada. Talvez o livro tenha sido retirado da estante?</p>
      <Link 
        href="/" 
        className="bg-brand-2 text-white px-6 py-2 rounded-full font-medium hover:bg-brand-1 transition-colors"
      >
        Voltar para o Início
      </Link>
    </div>
  );
}
