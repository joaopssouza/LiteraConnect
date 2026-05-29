'use client';

import dynamic from 'next/dynamic';

const DraftsClient = dynamic(() => import('./DraftsClient'), {
  ssr: false,
});

export default function DraftsPage() {
  return <DraftsClient />;
}
