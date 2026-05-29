import PostEditor from '@/components/PostEditor';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function NewPostClient() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <PostEditor />
    </div>
  );
}
