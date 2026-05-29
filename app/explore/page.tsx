'use client';

import dynamic from 'next/dynamic';

const ExploreClient = dynamic(() => import('./ExploreClient'), {
  ssr: false,
  loading: () => (
    <div className="max-w-2xl mx-auto w-full border-x border-[var(--border)] min-h-screen bg-[var(--bg-main)] p-12 flex items-center justify-center">
      <div className="text-[var(--text-main)]/40 font-medium animate-pulse">Carregando explorador...</div>
    </div>
  ),
});

export default function ExplorePage() {
  return <ExploreClient />;
}
