'use client';

import dynamic from 'next/dynamic';

const ActivityClient = dynamic(() => import('./ActivityClient'), {
  ssr: false,
  loading: () => (
    <div className="max-w-2xl mx-auto w-full sm:border-x border-[var(--border)]/10 min-h-screen bg-[var(--surface)] p-12 flex items-center justify-center">
      <div className="text-[var(--text-main)]/40 font-medium animate-pulse">Carregando atividades...</div>
    </div>
  ),
});

export default function ActivityPage() {
  return <ActivityClient />;
}
