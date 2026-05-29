'use client';

import dynamic from 'next/dynamic';

const ProfileRedirectClient = dynamic(() => import('./ProfileRedirectClient'), {
  ssr: false,
  loading: () => (
    <div className="max-w-2xl mx-auto w-full border-x border-[var(--border)] min-h-screen bg-[var(--bg-main)] p-8 text-center text-[var(--text-main)]/60">
      Redirecionando...
    </div>
  ),
});

export default function ProfilePage() {
  return <ProfileRedirectClient />;
}
