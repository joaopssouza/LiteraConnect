import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-brand-2 hover:underline mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para a página inicial
        </Link>
        
        <article className="prose prose-zinc dark:prose-invert max-w-none prose-a:text-brand-2 prose-a:no-underline hover:prose-a:underline">
          <h1 className="text-3xl font-black mb-2">Política de Privacidade — LiteraConnect</h1>
          <p className="text-sm text-zinc-500 mb-8">
            <strong>Versão:</strong> 1.0 <br />
            <strong>Última atualização:</strong> 04 de junho de 2026 <br />
            <strong>Vigência:</strong> A partir da data de atualização acima
          </p>

          <hr className="my-8 border-zinc-200 dark:border-zinc-800" />

          <h2 className="text-2xl font-bold mt-8 mb-4">1. Identificação do Controlador</h2>
          <p>
            <strong>LiteraConnect</strong> é operado por <strong>João Paulo Santos Souza</strong>, inscrito no CPF sob o nº <strong>146.413.356-56</strong>, com sede em <strong>Betim, Minas Gerais</strong>, doravante denominado simplesmente <strong>"LiteraConnect"</strong>, <strong>"nós"</strong> ou <strong>"nosso"</strong>.
          </p>
          <p>
            Para exercício dos seus direitos como titular de dados ou para quaisquer dúvidas sobre esta Política, entre em contato com nosso <strong>Encarregado de Proteção de Dados (DPO)</strong>:
          </p>
          <ul className="list-disc pl-5 mb-6">
            <li><strong>E-mail:</strong> contato@jpdev.uk</li>
            <li><strong>Resposta em até:</strong> 15 (quinze) dias úteis</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">2. Âmbito de Aplicação</h2>
          <p>
            Esta Política de Privacidade se aplica a todas as pessoas físicas (<strong>titulares</strong>) que acessam, se cadastram ou utilizam qualquer funcionalidade da plataforma LiteraConnect, acessível pelo domínio <strong>literaconnect.jpdev.uk</strong> e seus subdomínios.
          </p>
          <p>
            Ao utilizar nossa plataforma, você confirma que leu, compreendeu e concorda com os termos desta Política, em conformidade com a <strong>Lei nº 13.709/2018 (Lei Geral de Proteção de Dados — LGPD)</strong>.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">3. Dados Pessoais Coletados</h2>
          <p>Coletamos os seguintes dados pessoais, estritamente necessários para o funcionamento da plataforma:</p>
          
          <h3 className="text-xl font-semibold mt-6 mb-3">3.1 Dados fornecidos pelo titular</h3>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full text-sm text-left border-collapse border border-zinc-200 dark:border-zinc-700">
              <thead className="bg-zinc-100 dark:bg-zinc-800">
                <tr>
                  <th className="border border-zinc-200 dark:border-zinc-700 px-4 py-2 font-semibold">Categoria</th>
                  <th className="border border-zinc-200 dark:border-zinc-700 px-4 py-2 font-semibold">Dados</th>
                  <th className="border border-zinc-200 dark:border-zinc-700 px-4 py-2 font-semibold">Finalidade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Identificação</td>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Nome completo, nome de usuário (username)</td>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Criação e exibição do perfil público</td>
                </tr>
                <tr>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Contato</td>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Endereço de e-mail</td>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Autenticação, notificações e recuperação de conta</td>
                </tr>
                <tr>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Acesso</td>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Senha (armazenada com hash)</td>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Autenticação segura</td>
                </tr>
                <tr>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Perfil</td>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Foto de avatar, biografia, links externos</td>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Personalização do perfil</td>
                </tr>
                <tr>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Conteúdo</td>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Textos, artigos, rascunhos, comentários e mensagens</td>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Prestação do serviço de publicação e comunicação</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-xl font-semibold mt-6 mb-3">3.2 Dados coletados automaticamente</h3>
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full text-sm text-left border-collapse border border-zinc-200 dark:border-zinc-700">
              <thead className="bg-zinc-100 dark:bg-zinc-800">
                <tr>
                  <th className="border border-zinc-200 dark:border-zinc-700 px-4 py-2 font-semibold">Categoria</th>
                  <th className="border border-zinc-200 dark:border-zinc-700 px-4 py-2 font-semibold">Dados</th>
                  <th className="border border-zinc-200 dark:border-zinc-700 px-4 py-2 font-semibold">Finalidade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Técnicos</td>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Endereço IP, User-Agent do navegador</td>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Segurança, prevenção de fraudes e logs de acesso</td>
                </tr>
                <tr>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Sessão</td>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Tokens JWT de sessão (armazenados em cookies HttpOnly)</td>
                  <td className="border border-zinc-200 dark:border-zinc-700 px-4 py-2">Manutenção da sessão autenticada</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 mb-8 text-amber-900 dark:text-amber-100">
            <strong>Importante:</strong> O LiteraConnect <strong>não utiliza cookies de rastreamento de terceiros</strong>, ferramentas de análise de comportamento de mercado (como Google Analytics, Meta Pixel, etc.) nem vende ou compartilha dados pessoais com anunciantes.
          </div>

          <h2 className="text-2xl font-bold mt-8 mb-4">4. Bases Legais para o Tratamento</h2>
          <p>Todo tratamento de dados pessoais realizado pelo LiteraConnect está fundamentado em uma ou mais das seguintes bases legais:</p>
          <ul className="list-disc pl-5 mb-6">
            <li><strong>Consentimento (Art. 7º, I):</strong> Cadastro na plataforma, envio de notificações.</li>
            <li><strong>Execução de contrato (Art. 7º, V):</strong> Prestação dos serviços de publicação e interação.</li>
            <li><strong>Legítimo interesse (Art. 7º, IX):</strong> Segurança, prevenção de fraudes.</li>
            <li><strong>Cumprimento de obrigação legal (Art. 7º, II):</strong> Guarda de logs (Marco Civil da Internet).</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">5. Como os Dados São Armazenados</h2>
          <p>O LiteraConnect adota infraestrutura segura e hospedagem nacional de seus serviços. Não compartilhamos dados pessoais com terceiros para fins comerciais.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">6. Compartilhamento de Dados</h2>
          <p>O compartilhamento somente ocorre excepcionalmente, como no cumprimento de ordens judiciais ou para proteção contra fraudes.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">7. Direitos do Titular (Art. 18 da LGPD)</h2>
          <p>Você tem o direito de solicitar confirmação, acesso, correção, anonimização, bloqueio, eliminação ou portabilidade dos seus dados. Para isso, entre em contato via <strong>contato@jpdev.uk</strong>.</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">8. Cookies e Tecnologias de Rastreamento</h2>
          <p>Utilizamos <strong>exclusivamente cookies estritamente necessários</strong> para autenticação e sessão. Eles não podem ser desativados sem comprometer o funcionamento da plataforma.</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">9. Menores de Idade</h2>
          <p>O LiteraConnect não é destinado a menores de 18 anos. Contas identificadas nestas condições serão removidas.</p>

        </article>
      </div>
    </div>
  );
}
