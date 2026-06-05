import { Search, ChevronDown, BookOpen, MessageCircleQuestion, AlertCircle } from 'lucide-react';

export default function CentralAjudaPage() {
  const faqs = [
    {
      question: 'Como faço para publicar uma resenha?',
      answer: 'Para publicar uma resenha, basta clicar no ícone "+" (ou no botão Publicar) localizado no menu principal. Você pode adicionar a capa do livro, um título, o conteúdo da resenha e as tags desejadas.',
    },
    {
      question: 'Posso editar um comentário depois de publicado?',
      answer: 'No momento, comentários não podem ser editados após a publicação. Se cometer um erro, você pode excluir o comentário clicando nos três pontos ao lado dele e publicar novamente.',
    },
    {
      question: 'Como ocultar meu perfil?',
      answer: 'Vá até "Configurações" > "Central de Privacidade" e ative o botão "Perfil Privado". Seu conteúdo será exibido apenas para quem já te segue.',
    },
    {
      question: 'O que fazer se esqueci minha senha?',
      answer: 'Na tela de login, clique em "Esqueceu a senha?". Você receberá um e-mail com instruções para redefini-la rapidamente.',
    },
    {
      question: 'Como denunciar um post ou usuário?',
      answer: 'Em qualquer postagem ou perfil, clique no menu de opções (três pontinhos) e selecione "Denunciar". Nossa equipe analisará o conteúdo o mais rápido possível.',
    }
  ];

  return (
    <div className="flex flex-col h-full max-w-2xl">
      <div className="p-6 border-b border-[var(--border-main)] text-center py-10 bg-black/5 dark:bg-white/5 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-[var(--text-main)] mb-3">Como podemos ajudar?</h1>
          <div className="max-w-md mx-auto relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input 
              type="text" 
              placeholder="Busque por artigos, tutoriais ou dúvidas..." 
              className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--border-main)] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-2 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-[var(--border-main)] rounded-xl flex flex-col items-center text-center gap-2 hover:border-brand-2 transition-colors cursor-pointer bg-black/5 dark:bg-white/5">
            <BookOpen className="w-8 h-8 text-brand-1 mb-1" />
            <h3 className="font-semibold text-[var(--text-main)]">Guia de Uso</h3>
            <p className="text-xs text-[var(--text-secondary)]">Aprenda a usar a plataforma.</p>
          </div>
          <div className="p-4 border border-[var(--border-main)] rounded-xl flex flex-col items-center text-center gap-2 hover:border-brand-2 transition-colors cursor-pointer bg-black/5 dark:bg-white/5">
            <MessageCircleQuestion className="w-8 h-8 text-brand-3 mb-1" />
            <h3 className="font-semibold text-[var(--text-main)]">Comunidade</h3>
            <p className="text-xs text-[var(--text-secondary)]">Dúvidas sobre interações.</p>
          </div>
          <div className="p-4 border border-[var(--border-main)] rounded-xl flex flex-col items-center text-center gap-2 hover:border-brand-2 transition-colors cursor-pointer bg-black/5 dark:bg-white/5">
            <AlertCircle className="w-8 h-8 text-brand-2 mb-1" />
            <h3 className="font-semibold text-[var(--text-main)]">Regras</h3>
            <p className="text-xs text-[var(--text-secondary)]">Diretrizes do LiteraConnect.</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)] mb-4">Perguntas Frequentes</h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <details key={idx} className="group border border-[var(--border-main)] rounded-xl bg-[var(--surface)] overflow-hidden">
                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <span className="text-[var(--text-main)]">{faq.question}</span>
                  <span className="transition group-open:rotate-180">
                    <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
                  </span>
                </summary>
                <div className="p-4 pt-0 text-sm text-[var(--text-secondary)] border-t border-[var(--border-main)] bg-black/5 dark:bg-white/5 mt-2">
                  <p className="mt-4">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
