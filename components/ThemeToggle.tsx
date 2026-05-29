'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      aria-pressed={isDark}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
        hover:bg-brand-4/20 active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-3 ${className}`}
    >
      <span
        className="transition-all duration-300"
        style={{ transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)', opacity: isDark ? 1 : 0, position: 'absolute' }}
        aria-hidden="true"
      >
        <Moon className="w-5 h-5 text-brand-4" />
      </span>
      <span
        className="transition-all duration-300"
        style={{ transform: isDark ? 'rotate(-180deg)' : 'rotate(0deg)', opacity: isDark ? 0 : 1, position: 'absolute' }}
        aria-hidden="true"
      >
        <Sun className="w-5 h-5 text-brand-3" />
      </span>
    </button>
  );
}
