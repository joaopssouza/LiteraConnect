'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function ProfileRedirectClient() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Fetch user handle
        supabase
          .from('users')
          .select('handle')
          .eq('id', user.id)
          .single()
          .then(({ data, error }) => {
            if (data && !error) {
              router.replace(`/profile/${data.handle}`);
            } else {
              router.replace('/login');
            }
          });
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="max-w-2xl mx-auto w-full border-x border-[var(--border)] min-h-screen bg-[var(--bg-main)] p-8 text-center text-[var(--text-main)]/60">
      Redirecionando...
    </div>
  );
}
