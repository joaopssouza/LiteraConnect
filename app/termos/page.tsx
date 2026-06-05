import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-brand-2 hover:underline mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para a página inicial
        </Link>
        
        <article className="prose prose-zinc dark:prose-invert max-w-none prose-a:text-brand-2 prose-a:no-underline hover:prose-a:underline">
          <h1 className="text-3xl font-black mb-2">Termos de Uso — LiteraConnect</h1>
          <p className="text-sm text-zinc-500 mb-8">
            <strong>Versão:</strong> 1.0 <br />
            <strong>Última atualização:</strong> 04 de junho de 2026 <br />
            <strong>Vigência:</strong> A partir da data de atualização acima
          </p>

          <hr className="my-8 border-zinc-200 dark:border-zinc-800" />

          <h2 className="text-2xl font-bold mt-8 mb-4">1. Aceitação dos Termos</h2>
          <p>
            Ao acessar, criar uma conta ou utilizar qualquer funcionalidade do <strong>LiteraConnect</strong> (doravante "Plataforma"), você ("Usuário") concorda integralmente com estes Termos de Uso. Se você não concordar com qualquer disposição aqui contida, não utilize a Plataforma.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">2. Descrição da Plataforma</h2>
          <p>O LiteraConnect é uma plataforma social para leitores e autores, que permite:</p>
          <ul className="list-disc pl-5 mb-6">
            <li>Publicação de artigos, crônicas, poemas e outros conteúdos.</li>
            <li>Criação de perfil, interação social (curtir, seguir, comentar).</li>
            <li>Comunicação via chat.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">3. Elegibilidade e Cadastro</h2>
          <ul className="list-disc pl-5 mb-6">
            <li><strong>Requisitos de idade:</strong> O LiteraConnect é destinado exclusivamente a maiores de 18 anos.</li>
            <li><strong>Veracidade:</strong> Fornecer informações verdadeiras.</li>
            <li><strong>Segurança:</strong> O Usuário é responsável por suas credenciais.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">4. Regras de Conduta e Conteúdo</h2>
          <p>O conteúdo publicado deve ser de sua autoria original. É expressamente vedado publicar conteúdo que:</p>
          <ul className="list-disc pl-5 mb-6">
            <li>Viole direitos autorais ou direitos de propriedade intelectual.</li>
            <li>Seja difamatório, calunioso, injurioso ou incite ódio e discriminação.</li>
            <li>Contenha pornografia, fraude, spam ou malware.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">5. Propriedade Intelectual</h2>
          <p>
            Você mantém todos os direitos de propriedade intelectual sobre o seu conteúdo. Ao publicar, concede ao LiteraConnect uma licença não exclusiva para exibi-lo dentro da plataforma. O LiteraConnect detém os direitos sobre o código e interface da plataforma.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">6. Privacidade e Proteção de Dados</h2>
          <p>
            O tratamento dos seus dados pessoais é regido pela nossa Política de Privacidade, em conformidade com a LGPD (Lei nº 13.709/2018).
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">7. Limitação de Responsabilidade</h2>
          <p>
            A plataforma é fornecida "no estado em que se encontra", sem garantias de disponibilidade ininterrupta. Não nos responsabilizamos pelo conteúdo gerado pelos usuários.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">8. Contato</h2>
          <ul className="list-disc pl-5 mb-6">
            <li><strong>E-mail geral:</strong> contato@jpdev.uk</li>
            <li><strong>Privacidade:</strong> contato@jpdev.uk</li>
          </ul>

        </article>
      </div>
    </div>
  );
}
