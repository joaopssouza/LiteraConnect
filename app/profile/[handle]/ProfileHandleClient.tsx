'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PostCard } from '@/components/PostCard';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, X } from 'lucide-react';
import { uploadMedia } from '@/lib/supabase-storage';
import Link from 'next/link';
import { resolveAvatarUrl } from '@/lib/avatar';

type UserCard = {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
};

export default function ProfileHandleClient() {
  const params = useParams();
  const router = useRouter();
  const handle = params.handle as string;
  const { user: currentUser } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [isLoadingSavedPosts, setIsLoadingSavedPosts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [connectionsOpen, setConnectionsOpen] = useState<'followers' | 'following' | null>(null);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [followersList, setFollowersList] = useState<UserCard[]>([]);
  const [followingList, setFollowingList] = useState<UserCard[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (handle) {
      fetchProfileAndPosts();
    }
  }, [handle, currentUser]);

  useEffect(() => {
    if (!profile || !currentUser || currentUser.id !== profile.id) return;
    fetchSavedPosts();
  }, [profile?.id, currentUser?.id]);

  useEffect(() => {
    if (activeTab === 'saved' && currentUser?.id === profile?.id) {
      fetchSavedPosts();
    }
  }, [activeTab, currentUser?.id, profile?.id]);

  const fetchProfileAndPosts = async () => {
    setLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('handle', handle)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
      setEditName(profileData?.name || '');
      setEditHandle(profileData?.handle || '');
      setEditBio(profileData?.bio || '');

      if (profileData) {
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            author:users!posts_user_id_fkey (
              name,
              handle,
              avatar_url
            ),
            likes(count),
            comments(count)
          `)
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        const postsWithComments = await Promise.all((postsData || []).map(async (post: any) => {
          const { data: recentComments } = await supabase
            .from('comments')
            .select('id, content, created_at, user_id, author:users!comments_user_id_fkey(name, handle, avatar_url), likes:comment_likes(count)')
            .eq('post_id', post.id)
            .is('parent_id', null)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(3);

          if (recentComments) {
            for (const c of recentComments) {
              const { count: repliesCount } = await supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('parent_id', c.id)
                .is('deleted_at', null);
              (c as any).likes_count = c.likes?.[0]?.count ?? 0;
              (c as any).replies_count = repliesCount ?? 0;
            }
          }
          return { ...post, recent_comments: recentComments || [] };
        }));

        setPosts(postsWithComments);

        const { count: followers } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profileData.id);
        if (followers !== null) setFollowersCount(followers);

        const { count: following } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', profileData.id);
        if (following !== null) setFollowingCount(following);

        if (currentUser && currentUser.id !== profileData.id) {
          const { data: followData } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', currentUser.id)
            .eq('following_id', profileData.id)
            .single();
          
          setIsFollowing(!!followData);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedPosts = async () => {
    if (!currentUser) return;

    setIsLoadingSavedPosts(true);
    try {
      const savedIds = JSON.parse(localStorage.getItem('saved-posts') || '[]') as string[];
      if (!savedIds.length) {
        setSavedPosts([]);
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:users!posts_user_id_fkey (
            name,
            handle,
            avatar_url
          ),
          likes(count),
          comments(count)
        `)
        .in('id', savedIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const byId = new Map((data || []).map((post: any) => [post.id, post]));
      const ordered = savedIds
        .map((savedId) => byId.get(savedId))
        .filter(Boolean);

      setSavedPosts(ordered as any[]);
    } catch (error) {
      console.error('Erro ao buscar posts salvos:', error);
    } finally {
      setIsLoadingSavedPosts(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !profile || isFollowLoading) return;

    setIsFollowLoading(true);

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from('follows')
          .insert([
            { follower_id: currentUser.id, following_id: profile.id }
          ]);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Erro ao seguir/deixar de seguir:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const fetchConnections = async (target: 'followers' | 'following') => {
    if (!profile) return;

    setConnectionsLoading(true);
    try {
      if (target === 'followers') {
        const { data, error } = await supabase
          .from('follows')
          .select('follower:users!follower_id(id, name, handle, avatar_url)')
          .eq('following_id', profile.id);

        if (error) throw error;
        setFollowersList((data || []).map((item: any) => item.follower).filter(Boolean));
      } else {
        const { data, error } = await supabase
          .from('follows')
          .select('following:users!following_id(id, name, handle, avatar_url)')
          .eq('follower_id', profile.id);

        if (error) throw error;
        setFollowingList((data || []).map((item: any) => item.following).filter(Boolean));
      }
    } catch (error) {
      console.error('Erro ao carregar conexões:', error);
    } finally {
      setConnectionsLoading(false);
    }
  };

  const openConnectionsModal = async (target: 'followers' | 'following') => {
    setConnectionsOpen(target);
    await fetchConnections(target);
  };

  const saveProfile = async () => {
    if (!currentUser || !profile) return;

    const cleanName = editName.trim();
    const cleanHandle = editHandle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanBio = editBio.trim();

    if (!cleanName) {
      alert('O nome não pode ficar vazio.');
      return;
    }

    if (!cleanHandle || cleanHandle.length < 3) {
      alert('O @handle precisa ter ao menos 3 caracteres.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const { data: existingHandle, error: handleCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('handle', cleanHandle)
        .neq('id', currentUser.id)
        .maybeSingle();

      if (handleCheckError) throw handleCheckError;
      if (existingHandle) {
        alert('Esse @handle já está em uso.');
        setIsSavingProfile(false);
        return;
      }

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          name: cleanName,
          handle: cleanHandle,
          bio: cleanBio || null,
        })
        .eq('id', currentUser.id)
        .select('*')
        .single();

      if (error) throw error;

      setProfile(updatedUser);
      setIsEditModalOpen(false);
      if (cleanHandle !== handle) {
        router.replace(`/profile/${cleanHandle}`);
      }
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !profile) return;

    setIsUploadingAvatar(true);
    try {
      const uploadedUrl = await uploadMedia(file);
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: uploadedUrl })
        .eq('id', currentUser.id);

      if (error) throw error;
      setProfile({ ...profile, avatar_url: uploadedUrl });
      alert('Foto de perfil atualizada!');
    } catch (error: any) {
      console.error('Erro no upload:', error);
      alert('Erro ao atualizar foto.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return <div className="max-w-2xl mx-auto w-full border-x border-[var(--border)] min-h-screen bg-[var(--bg-main)] p-8 text-center text-[var(--text-main)]/60">Carregando...</div>;
  }

  if (!profile) {
    return <div className="max-w-2xl mx-auto w-full border-x border-[var(--border)] min-h-screen bg-[var(--bg-main)] p-8 text-center text-[var(--text-main)]/60">Perfil não encontrado.</div>;
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const isShowingSaved = isOwnProfile && activeTab === 'saved';
  const visiblePosts = isShowingSaved ? savedPosts : posts;

  return (
    <div className="max-w-2xl mx-auto w-full border-x border-[var(--border)] min-h-screen bg-[var(--bg-main)]">
      <header className="sticky top-0 z-10 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--border)] p-4">
        <h1 className="text-xl font-bold text-[var(--text-main)]">{profile.name}</h1>
        <p className="text-sm text-[var(--text-main)]/60">@{profile.handle}</p>
      </header>

      <div className="p-6 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex justify-between items-start">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-brand-2 flex-shrink-0 flex items-center justify-center text-white font-bold overflow-hidden relative border-4 border-[var(--surface)] shadow-sm group">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.name} fill className="object-cover" unoptimized priority />
              ) : (
                <span className="text-3xl">{profile.name.charAt(0)}</span>
              )}
              
              {isOwnProfile && (
                <div 
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            {isUploadingAvatar && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-brand-2 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                Enviando...
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarChange} />
          </div>
          
          {currentUser && !isOwnProfile && (
            <button 
              onClick={handleFollow}
              disabled={isFollowLoading}
              className={`px-6 py-2 rounded-full font-bold transition-all active:scale-95 ${
                isFollowing 
                  ? 'border border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--border)]/30' 
                  : 'bg-brand-2 text-white hover:opacity-90 shadow-lg'
              } disabled:opacity-60`}
            >
              {isFollowLoading ? '...' : isFollowing ? 'Seguindo' : 'Seguir'}
            </button>
          )}
          {isOwnProfile && (
            <div className="flex gap-2">
              <Link
                href="/settings"
                className="w-10 h-10 flex items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--border)]/30 transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              </Link>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-6 py-2 rounded-full font-bold bg-brand-2 text-white hover:opacity-90 shadow-lg active:scale-95 transition-all"
              >
                Editar Perfil
              </button>
            </div>
          )}
        </div>

        <div className="mt-4">
          <h2 className="text-2xl font-bold text-[var(--text-main)]">{profile.name}</h2>
          <p className="text-[var(--text-main)]/50">@{profile.handle}</p>
          {profile.bio && (
            <p className="mt-4 text-[var(--text-main)] whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
          )}
          
          <div className="flex gap-6 mt-6 text-sm text-[var(--text-main)]/60">
            <button onClick={() => openConnectionsModal('following')} className="hover:text-brand-2 transition-colors">
              <strong className="text-[var(--text-main)] font-bold">{followingCount}</strong> Seguindo
            </button>
            <button onClick={() => openConnectionsModal('followers')} className="hover:text-brand-2 transition-colors">
              <strong className="text-[var(--text-main)] font-bold">{followersCount}</strong> Seguidores
            </button>
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <div className="border-b border-[var(--border)] bg-[var(--bg-main)] px-4">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('posts')}
              className={`py-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'posts'
                  ? 'border-brand-2 text-[var(--text-main)]'
                  : 'border-transparent text-[var(--text-main)]/40 hover:text-[var(--text-main)]'
              }`}
            >
              Publicados
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`py-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'saved'
                  ? 'border-brand-2 text-[var(--text-main)]'
                  : 'border-transparent text-[var(--text-main)]/40 hover:text-[var(--text-main)]'
              }`}
            >
              Salvos
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-[var(--border)]">
        {isShowingSaved && isLoadingSavedPosts ? (
          <div className="p-12 text-center text-[var(--text-main)]/40 font-medium italic">Carregando posts salvos...</div>
        ) : visiblePosts.length > 0 ? (
          visiblePosts.map((post) => (
            <PostCard 
              key={post.id} 
              id={post.id}
              authorId={post.user_id}
              author={{
                name: post.author?.name || 'Usuário',
                handle: post.author?.handle || 'usuario',
                avatar: resolveAvatarUrl(post.author?.avatar_url, post.user_id, 100)
              }}
              content={post.content}
              bookTitle={post.book_title}
              bookCover={post.book_cover_url ?? post.video_url}
              media={post.media}
              timeAgo={new Date(post.created_at).toLocaleDateString('pt-BR')}
              likes={post.likes?.[0]?.count ?? 0}
              comments={post.comments?.[0]?.count ?? 0}
              recent_comments={post.recent_comments}
              reposts={0}
              views={post.views ?? 0}
              shares={post.shares ?? 0}
              onLocalPostPreferenceChange={fetchSavedPosts}
            />
          ))
        ) : (
          <div className="p-12 text-center text-[var(--text-main)]/40 font-medium italic">
            {isShowingSaved ? 'Você ainda não salvou nenhuma postagem.' : 'Nenhuma resenha publicada ainda.'}
          </div>
        )}
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
              <h3 className="font-bold text-[var(--text-main)] text-xl">Editar Perfil</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-full hover:bg-[var(--border)]/50 transition-colors">
                <X className="w-5 h-5 text-[var(--text-main)]" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-brand-2 uppercase tracking-widest ml-1">Nome</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full mt-1.5 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 transition-all"
                  maxLength={60}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-brand-2 uppercase tracking-widest ml-1">@handle</label>
                <input
                  value={editHandle}
                  onChange={(e) => setEditHandle(e.target.value)}
                  className="w-full mt-1.5 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 transition-all"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-brand-2 uppercase tracking-widest ml-1">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full mt-1.5 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 min-h-28 resize-none transition-all"
                  maxLength={220}
                />
              </div>
            </div>

            <div className="p-4 bg-[var(--border)]/5 border-t border-[var(--border)] flex justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-2 rounded-full font-bold text-[var(--text-main)]/60 hover:bg-[var(--border)]/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveProfile}
                disabled={isSavingProfile}
                className="px-8 py-2 rounded-full bg-brand-2 text-white font-bold hover:opacity-90 shadow-lg disabled:opacity-40 transition-all active:scale-95"
              >
                {isSavingProfile ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {connectionsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--text-main)] text-xl capitalize">
                {connectionsOpen === 'followers' ? 'Seguidores' : 'Seguindo'}
              </h3>
              <button onClick={() => setConnectionsOpen(null)} className="p-2 rounded-full hover:bg-[var(--border)]/50 transition-colors">
                <X className="w-5 h-5 text-[var(--text-main)]" />
              </button>
            </div>

            <div className="p-2 overflow-y-auto flex-1">
              {connectionsLoading ? (
                <div className="p-12 text-center text-[var(--text-main)]/40 italic">Carregando...</div>
              ) : (connectionsOpen === 'followers' ? followersList : followingList).length === 0 ? (
                <div className="p-12 text-center text-[var(--text-main)]/40">Nenhuma pessoa encontrada.</div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {(connectionsOpen === 'followers' ? followersList : followingList).map((person) => (
                    <Link
                      key={person.id}
                      href={`/profile/${person.handle}`}
                      onClick={() => setConnectionsOpen(null)}
                      className="flex items-center gap-4 p-4 hover:bg-[var(--bg-main)] transition-all rounded-xl"
                    >
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[var(--border)]/20 border border-[var(--border)]">
                        <Image src={resolveAvatarUrl(person.avatar_url, person.id, 100)} alt="" fill className="object-cover" />
                      </div>
                      <div>
                        <div className="font-bold text-[var(--text-main)]">{person.name}</div>
                        <div className="text-sm text-[var(--text-main)]/50">@{person.handle}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
