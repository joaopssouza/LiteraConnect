import { ExternalLink, MessageSquareWarning, ShieldAlert, HeadphonesIcon } from 'lucide-react';
import Link from 'next/link';

export default function AjudaPage() {
  const links = [
    {
      title: 'Central de Ajuda',
      icon: ExternalLink,
      href: '/settings/central-ajuda', // Exemplo de rota futura
    },
    {
      title: 'Central de Privacidade e Segurança',
      icon: ShieldAlert,
      href: '/settings/central-privacidade',
    },
    {
      title: 'Pedidos de suporte',
      icon: HeadphonesIcon,
      href: '/settings/pedidos', // Exemplo de rota futura
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-[var(--border-main)]">
        <h1 className="text-2xl font-bold">Ajuda</h1>
      </div>
      
      <div className="p-2 flex-1">
        {links.map((link, index) => {
          const Icon = link.icon;
          return (
            <Link 
              key={index} 
              href={link.href}
              className="flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors group"
            >
              <span className="text-sm font-medium text-[var(--text-main)]">{link.title}</span>
              <Icon className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-brand-1 transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
