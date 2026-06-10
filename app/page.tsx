'use client';

import dynamic from 'next/dynamic';

const HomeClient = dynamic(() => import('./HomeClient'), {
  ssr: false,
  loading: () => (
    <div className="max-w-2xl mx-auto w-full sm:border-x border-[var(--border)]/10 min-h-screen bg-[var(--bg-main)] p-12 flex items-center justify-center">
      <div className="text-[var(--text-main)]/40 font-medium animate-pulse">Carregando feed...</div>
    </div>
  ),
});

export default function HomePage() {
  return <HomeClient />;
}
