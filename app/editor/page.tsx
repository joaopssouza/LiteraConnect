'use client';

import dynamic from 'next/dynamic';

const EditorClient = dynamic(() => import('./EditorClient'), {
  ssr: false,
  loading: () => (
    <div className="bg-stone-50 min-h-screen pt-20 pb-12 flex items-center justify-center">
      <div className="text-stone-400 font-medium animate-pulse">Carregando editor...</div>
    </div>
  ),
});

export default function EditorPage() {
  return <EditorClient />;
}
