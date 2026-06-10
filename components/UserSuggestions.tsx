'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { resolveAvatarUrl } from '@/lib/avatar';

type SuggestedUser = {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  bio: string | null;
};

const formatDisplayName = (name: string) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[1]}`;
};

type FollowMap = Record<string, boolean>;

export function UserSuggestions({ title = 'Pessoas para seguir' }: { title?: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [followMap, setFollowMap] = useState<FollowMap>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  const followedIds = useMemo(
    () => Object.entries(followMap).filter(([, value]) => value).map(([key]) => key),
    [followMap]
  );

  useEffect(() => {
    const loadSuggestions = async () => {
      if (!user) {
        setUsers([]);
        setFollowMap({});
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: follows, error: followsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followsError) throw followsError;

        const alreadyFollowing = new Set((follows || []).map((row: any) => row.following_id));

        const { data: people, error: peopleError } = await supabase
          .from('users')
          .select('id, name, handle, avatar_url, bio')
          .neq('id', user.id)
          .limit(30);

        if (peopleError) throw peopleError;

        const sorted = (people || [])
          .sort((a: SuggestedUser, b: SuggestedUser) => {
            const aScore = alreadyFollowing.has(a.id) ? 1 : 0;
            const bScore = alreadyFollowing.has(b.id) ? 1 : 0;
            return aScore - bScore;
          })
          .slice(0, 3);

        const nextFollowMap: FollowMap = {};
        sorted.forEach((person: SuggestedUser) => {
          nextFollowMap[person.id] = alreadyFollowing.has(person.id);
        });

        setUsers(sorted);
        setFollowMap(nextFollowMap);
      } catch (error) {
        console.error('Erro ao carregar sugestões:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSuggestions();
  }, [user]);

  const toggleFollow = async (personId: string) => {
    if (!user || pendingId) return;

    const currentlyFollowing = !!followMap[personId];
    setPendingId(personId);

    setFollowMap((prev) => ({ ...prev, [personId]: !currentlyFollowing }));

    try {
      if (currentlyFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', personId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .insert([{ follower_id: user.id, following_id: personId }]);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Erro ao seguir/deixar de seguir:', error);
      setFollowMap((prev) => ({ ...prev, [personId]: currentlyFollowing }));
    } finally {
      setPendingId(null);
    }
  };

  if (!user) return null;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]/50">
        <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">{title}</h3>
      </div>

      {loading ? (
        <div className="p-6 text-sm text-[var(--text-main)]/40 font-medium text-center italic">Carregando sugestões...</div>
      ) : users.length === 0 ? (
        <div className="p-6 text-sm text-[var(--text-main)]/40 font-medium text-center">Sem sugestões no momento.</div>
      ) : (
        <div className="flex flex-col">
          {users.map((person) => {
            const isFollowing = !!followMap[person.id];
            const isPending = pendingId === person.id;

            return (
              <div key={person.id} className="p-4 flex items-center gap-3 hover:bg-[var(--bg-main)]/50 transition-colors">
                <Link href={`/profile/${person.handle}`} className="relative w-11 h-11 rounded-full overflow-hidden bg-[var(--border)]/20 flex-shrink-0 border border-[var(--border)]">
                  <Image
                    src={resolveAvatarUrl(person.avatar_url, person.id, 100)}
                    alt={person.name}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                    sizes="44px"
                    unoptimized
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <Link href={`/profile/${person.handle}`} className="font-bold text-[var(--text-main)] hover:underline block truncate text-sm">
                    {formatDisplayName(person.name)}
                  </Link>
                  <Link href={`/profile/${person.handle}`} className="text-xs text-[var(--text-main)]/50 hover:underline block truncate">
                    @{person.handle}
                  </Link>
                  {person.bio && <p className="text-xs text-[var(--text-main)]/60 line-clamp-1 mt-0.5">{person.bio}</p>}
                </div>

                <button
                  onClick={() => toggleFollow(person.id)}
                  disabled={isPending}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-60 active:scale-95 ${
                    isFollowing
                      ? 'border border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--border)]/30'
                      : 'bg-brand-2 text-white hover:opacity-90 shadow-sm'
                  }`}
                >
                  {isPending ? '...' : isFollowing ? 'Seguindo' : 'Seguir'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {followedIds.length > 0 && (
        <div className="px-4 py-2 text-[10px] font-bold text-[var(--text-main)]/30 border-t border-[var(--border)] bg-[var(--surface)]/30 uppercase tracking-tight">
          Você segue {followedIds.length} desta lista
        </div>
      )}
    </section>
  );
}
