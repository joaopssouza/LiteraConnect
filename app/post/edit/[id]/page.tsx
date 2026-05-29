'use client';

import dynamic from 'next/dynamic';

const EditPostClient = dynamic(() => import('./EditPostClient'), {
  ssr: false,
});

export default function EditPostPage() {
  return <EditPostClient />;
}
