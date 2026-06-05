'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Shield, Sliders, MonitorPlay, ChevronLeft, LifeBuoy, ShieldCheck, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const settingsLinks = [
    { href: '/settings/account', label: 'Conta', icon: User },
    { href: '/settings/preferences', label: 'Preferências', icon: Sliders },
    { href: '/settings/security', label: 'Segurança', icon: MonitorPlay },
    { href: '/settings/ajuda', label: 'Ajuda', icon: LifeBuoy },
    { href: '/settings/central-privacidade', label: 'Central de Privacidade', icon: ShieldCheck },
    { href: '/settings/status', label: 'Status da conta', icon: UserCog },
  ];

  const isRootSettings = pathname === '/settings';

  return (
    <div className="max-w-4xl mx-auto border-x min-h-screen border-[var(--border)] bg-[var(--bg-main)] flex flex-col md:flex-row">
      {/* Mobile Header (Only on specific pages we can show back button) */}
      
      {/* Menu / Master */}
      <aside className={cn(
        "md:w-64 border-r border-[var(--border)] bg-[var(--surface)] shrink-0 flex-col",
        !isRootSettings ? "hidden md:flex" : "flex",
        "h-full min-h-screen"
      )}>
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--text-main)]">Configurações</h1>
          <ThemeToggle />
        </div>
        <nav className="p-2 flex flex-col gap-1">
          {settingsLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                  isActive
                    ? 'bg-[var(--border)] text-[var(--text-main)] font-semibold'
                    : 'text-[var(--text-main)]/60 hover:bg-[var(--border)]/50 hover:text-[var(--text-main)]'
                )}
              >
                <link.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Content / Detail */}
      <div className={cn(
        "flex-1 bg-[var(--bg-main)] flex flex-col",
        isRootSettings ? "hidden md:flex" : "flex"
      )}>
        {!isRootSettings && (
          <div className="md:hidden p-4 border-b border-[var(--border)] flex items-center gap-3 sticky top-0 bg-[var(--surface)] z-10">
            <Link href="/settings" className="p-2 -ml-2 rounded-full hover:bg-[var(--border)] text-[var(--text-main)] transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h2 className="text-lg font-bold text-[var(--text-main)] truncate">
              {settingsLinks.find(l => pathname.startsWith(l.href))?.label || 'Configurações'}
            </h2>
          </div>
        )}
        <div className="p-4 md:p-8 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
