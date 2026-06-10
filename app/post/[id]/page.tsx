'use client';

import dynamic from 'next/dynamic';

const PostDetailClient = dynamic(() => import('./PostDetailClient'), {
  ssr: false,
});

export default function PostPage() {
  return <PostDetailClient />;
}
