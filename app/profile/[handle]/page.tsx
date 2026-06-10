'use client';

import dynamic from 'next/dynamic';

const ProfileHandleClient = dynamic(() => import('./ProfileHandleClient'), {
  ssr: false,
  loading: () => (
    <div className="max-w-2xl mx-auto w-full min-h-screen bg-[var(--bg-main)] p-8 text-center text-[var(--text-main)]/60">
      Carregando perfil...
    </div>
  ),
});

export default function ProfileHandlePage() {
  return <ProfileHandleClient />;
}
