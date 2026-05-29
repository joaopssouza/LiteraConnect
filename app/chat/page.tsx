'use client';

import dynamic from 'next/dynamic';

const ChatClient = dynamic(() => import('./ChatClient'), {
  ssr: false,
  loading: () => (
    <div className="max-w-5xl mx-auto w-full min-h-screen bg-[var(--bg-main)] p-12 flex items-center justify-center">
      <div className="text-[var(--text-main)]/40 font-medium animate-pulse">Carregando mensagens...</div>
    </div>
  ),
});

export default function ChatPage() {
  return <ChatClient />;
}
