'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Rotas onde o footer deve aparecer
  const showFooterPaths = ['/login', '/explore', '/settings', '/termos', '/privacidade'];
  // O footer também deve aparecer na home (feed) `/`
  
  const shouldShow = pathname === '/' || showFooterPaths.some(p => pathname.startsWith(p)) && !pathname.startsWith('/reels');

  if (!shouldShow) return null;

  const footerLinks = [
    { name: 'LiteraConnect', href: '/' },
    { name: 'Ajuda', href: '/settings/ajuda' },
    { name: 'Privacidade', href: '/settings/central-privacidade' },
    { name: 'Termos', href: '/termos' },
  ];

  return (
    <footer className="w-full py-8 mt-auto border-t border-[var(--border-main)] bg-[var(--bg-main)]">
      <div className="max-w-4xl mx-auto px-4 flex flex-col items-center">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
          {footerLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-xs text-[var(--text-secondary)] hover:underline"
            >
              {link.name}
            </Link>
          ))}
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)] mt-2">
          <span>© {new Date().getFullYear()} LiteraConnect</span>
        </div>
      </div>
    </footer>
  );
}
