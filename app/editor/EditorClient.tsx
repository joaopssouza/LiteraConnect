'use client';

import PostEditor from '@/components/PostEditor';

export default function EditorClient() {
  return (
    <div className="bg-stone-50 min-h-screen pt-20 pb-12">
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex-1 w-full">
        <PostEditor />
      </main>
    </div>
  );
}
