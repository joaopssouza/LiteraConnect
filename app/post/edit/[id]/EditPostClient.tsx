'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PostEditor from '@/components/PostEditor';

export default function EditPostClient() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) setError(error.message);
      setPost(data);
      setLoading(false);
    };
    if (id) fetchPost();
  }, [id]);

  if (loading) return <div className="max-w-4xl mx-auto py-8">Carregando editor...</div>;
  if (!post) return <div className="max-w-4xl mx-auto py-8 text-red-600">Post não encontrado ou erro: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <PostEditor initialDraft={post} />
    </div>
  );
}
