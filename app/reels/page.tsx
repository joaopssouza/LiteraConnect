'use client';

import dynamic from 'next/dynamic';

const ReelsClient = dynamic(() => import('./ReelsClient'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div className="text-white/40 font-medium animate-pulse">Carregando Reels...</div>
    </div>
  ),
});

export default function ReelsPage() {
  return <ReelsClient />;
}
