'use client';

import dynamic from 'next/dynamic';

const NewPostClient = dynamic(() => import('./NewPostClient'), {
  ssr: false,
});

export default function PostPage() {
  return <NewPostClient />;
}
