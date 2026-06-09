'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PostCard } from '@/components/PostCard';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, X, Plus, Trash2, Edit3, BookOpen, Search, Check, Trophy, Lock, Info } from 'lucide-react';
import { uploadMedia } from '@/lib/supabase-storage';
import Link from 'next/link';
import { resolveAvatarUrl } from '@/lib/avatar';
import BadgeDisplay from '@/components/BadgeDisplay';
import { toast } from 'sonner';

const SkeletonBookCard = () => (
  <div className="relative group rounded-lg overflow-hidden animate-pulse">
    <div className="relative aspect-[2/3] w-full bg-[var(--border)]/20 rounded-lg overflow-hidden shadow-sm"></div>
    <div className="mt-2 px-0.5 space-y-2">
      <div className="h-3 bg-[var(--border)]/20 rounded w-3/4"></div>
      <div className="h-2 bg-[var(--border)]/20 rounded w-1/2"></div>
    </div>
  </div>
);

const SkeletonBookshelf = () => (
  <div className="p-6">
    <div className="space-y-8">
      {[1, 2].map(i => (
        <div key={i}>
          <div className="h-6 bg-[var(--border)]/20 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(j => <SkeletonBookCard key={`${i}-${j}`} />)}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SkeletonPostCard = () => (
  <div className="p-4 border-b border-[var(--border)] animate-pulse flex gap-3">
    <div className="w-10 h-10 rounded-full bg-[var(--border)]/20 shrink-0"></div>
    <div className="flex-1 space-y-3">
      <div className="flex gap-2">
        <div className="h-4 bg-[var(--border)]/20 rounded w-24"></div>
        <div className="h-4 bg-[var(--border)]/20 rounded w-16"></div>
      </div>
      <div className="h-3 bg-[var(--border)]/20 rounded w-full"></div>
      <div className="h-3 bg-[var(--border)]/20 rounded w-5/6"></div>
      <div className="h-48 bg-[var(--border)]/20 rounded w-full mt-2"></div>
    </div>
  </div>
);

const SkeletonPosts = () => (
  <div>
    {[1, 2, 3].map(i => <SkeletonPostCard key={i} />)}
  </div>
);

const SkeletonProfile = () => (
  <div className="max-w-2xl mx-auto w-full border-x border-[var(--border)] min-h-screen bg-[var(--bg-main)] animate-pulse">
    <div className="sticky top-0 z-10 bg-[var(--bg-main)]/80 border-b border-[var(--border)] p-4 space-y-2">
      <div className="h-5 bg-[var(--border)]/20 rounded w-32"></div>
      <div className="h-3 bg-[var(--border)]/20 rounded w-20"></div>
    </div>
    <div className="p-6 border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="flex justify-between items-start">
        <div className="w-24 h-24 rounded-full bg-[var(--border)]/20 shrink-0"></div>
        <div className="w-24 h-8 rounded-full bg-[var(--border)]/20"></div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-6 bg-[var(--border)]/20 rounded w-48"></div>
        <div className="h-4 bg-[var(--border)]/20 rounded w-32"></div>
        <div className="h-4 bg-[var(--border)]/20 rounded w-full mt-4"></div>
        <div className="h-4 bg-[var(--border)]/20 rounded w-5/6"></div>
      </div>
    </div>
    <SkeletonPosts />
  </div>
);

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
  const [bookshelf, setBookshelf] = useState<{want_to_read: any[], reading: any[], read: any[]} | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'bookshelf'>('posts');
  const [isLoadingSavedPosts, setIsLoadingSavedPosts] = useState(false);
  const [isLoadingBookshelf, setIsLoadingBookshelf] = useState(false);
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

  // Estados da Fase 7: Metas de Leitura e Adição de Livros
  const [goal, setGoal] = useState<any>(null);
  const [isLoadingGoal, setIsLoadingGoal] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editGoalTarget, setEditGoalTarget] = useState(12);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [badgesExpanded, setBadgesExpanded] = useState(false);

  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);
  const [bookSearchResults, setBookSearchResults] = useState<any[]>([]);
  const [bookToRemove, setBookToRemove] = useState<string | null>(null);
  const [selectedBookDetails, setSelectedBookDetails] = useState<any>(null);

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
    } else if (activeTab === 'bookshelf' && profile?.id) {
      fetchBookshelf();
      fetchGoal();
    }
  }, [activeTab, currentUser?.id, profile?.id]);

  const fetchBookshelf = async () => {
    if (!profile) return;
    setIsLoadingBookshelf(true);
    try {
      const res = await fetch(`/api/profile/bookshelf/${profile.id}`);
      if (res.ok) {
        const data = await res.json();
        setBookshelf(data);
      }
    } catch (error) {
      console.error('Erro ao buscar estante:', error);
    } finally {
      setIsLoadingBookshelf(false);
    }
  };

  const fetchGoal = async () => {
    if (!profile) return;
    setIsLoadingGoal(true);
    try {
      const res = await fetch('/api/profile/goals');
      if (res.ok) {
        const data = await res.json();
        setGoal(data.goal);
        setEditGoalTarget(data.goal?.target_books || 12);
      }
    } catch (e) {
      console.error('Erro ao buscar meta:', e);
    } finally {
      setIsLoadingGoal(false);
    }
  };

  const saveGoal = async () => {
    setIsSavingGoal(true);
    try {
      const res = await fetch('/api/profile/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetBooks: editGoalTarget })
      });
      if (res.ok) {
        const data = await res.json();
        setGoal(data.goal);
        setIsGoalModalOpen(false);
      } else {
        alert('Erro ao salvar meta.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao salvar meta.');
    } finally {
      setIsSavingGoal(false);
    }
  };

  const updateBookStatus = async (bookId: string, status: string) => {
    try {
      const res = await fetch('/api/profile/bookshelf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, status })
      });
      if (res.ok) {
        await fetchBookshelf();
        await fetchGoal();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmRemoveBook = async () => {
    if (!bookToRemove) return;
    const bookId = bookToRemove;
    setBookToRemove(null);
    try {
      const res = await fetch(`/api/profile/bookshelf?bookId=${bookId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchBookshelf();
        await fetchGoal();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBookSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookSearchQuery.trim() || bookSearchQuery.length < 2) return;
    setIsSearchingBooks(true);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(bookSearchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setBookSearchResults(data.results || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingBooks(false);
    }
  };

  const handleAddBookToBookshelf = async (bookId: string, status: string) => {
    try {
      const res = await fetch('/api/profile/bookshelf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, status })
      });
      if (res.ok) {
        setIsAddBookModalOpen(false);
        setBookSearchQuery('');
        setBookSearchResults([]);
        toast.success('Estante atualizada com sucesso!');
        await fetchBookshelf();
        await fetchGoal();
      } else {
        toast.error('Erro ao adicionar livro.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Ocorreu um erro ao conectar ao servidor.');
    }
  };

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

    if (cleanName.length > 40) {
      alert('O nome excede 40 caracteres.');
      return;
    }

    if (!cleanHandle || cleanHandle.length < 2) {
      alert('O @handle precisa ter ao menos 2 caracteres.');
      return;
    }

    if (cleanHandle.length > 10) {
      alert('O @handle excede 10 caracteres.');
      return;
    }

    if (cleanBio.length > 350) {
      alert('A bio excede 350 caracteres.');
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
    return <SkeletonProfile />;
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

          {/* Gamificação: Conquistas (Badges) */}
          <div className="mt-6 pt-4 border-t border-[var(--border)]/40">
            <button
              type="button"
              onClick={() => setBadgesExpanded((current) => !current)}
              className="flex w-full items-center justify-between gap-3 mb-3 text-left rounded-lg px-1 py-1 -mx-1 hover:bg-[var(--border)]/5 transition-colors"
              aria-expanded={badgesExpanded}
            >
              <h3 className="text-xs font-bold text-brand-2 uppercase tracking-widest">Conquistas</h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)]/45 hover:text-brand-2 transition-colors">
                {badgesExpanded ? 'Resumir' : 'Ver todas'}
              </span>
            </button>
            <BadgeDisplay userId={profile.id} compact={!badgesExpanded} />
          </div>
        </div>
      </div>

      <div className="border-b border-[var(--border)] bg-[var(--bg-main)] px-4">
        <div className="flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'posts'
                ? 'border-brand-2 text-[var(--text-main)]'
                : 'border-transparent text-[var(--text-main)]/40 hover:text-[var(--text-main)]'
            }`}
          >
            Publicados
          </button>
          <button
            onClick={() => setActiveTab('bookshelf')}
            className={`py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'bookshelf'
                ? 'border-brand-2 text-[var(--text-main)]'
                : 'border-transparent text-[var(--text-main)]/40 hover:text-[var(--text-main)]'
            }`}
          >
            Estante
          </button>
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab('saved')}
              className={`py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'saved'
                  ? 'border-brand-2 text-[var(--text-main)]'
                  : 'border-transparent text-[var(--text-main)]/40 hover:text-[var(--text-main)]'
              }`}
            >
              Salvos
            </button>
          )}
        </div>
      </div>

      {profile.is_private && !isOwnProfile && !isFollowing ? (
        <div className="p-16 flex flex-col items-center justify-center text-center bg-[var(--surface)] mt-4 rounded-xl mx-6 border border-[var(--border)]">
          <Lock className="w-16 h-16 text-[var(--text-main)]/20 mb-4" />
          <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Esta conta é privada</h3>
          <p className="text-sm text-[var(--text-main)]/60 max-w-sm">
            Siga {profile.name} para ver suas fotos, resenhas, estante de livros e muito mais.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
        {activeTab === 'bookshelf' ? (
          isLoadingBookshelf ? (
            <SkeletonBookshelf />
          ) : bookshelf ? (
            <div className="p-6">
              
              {/* Barra de Progresso da Meta de Leitura */}
              {goal && (
                <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] mb-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <div>
                      <h3 className="text-lg font-serif font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-brand-2" /> Meta de Leitura {goal.goal_year}
                      </h3>
                      <p className="text-xs text-[var(--text-main)]/60 mt-0.5">
                        Você leu {goal.current_books} de {goal.target_books} livros.
                      </p>
                    </div>
                    {isOwnProfile && (
                      <button
                        onClick={() => { setEditGoalTarget(goal.target_books); setIsGoalModalOpen(true); }}
                        className="text-xs font-bold text-brand-2 hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Ajustar Meta
                      </button>
                    )}
                  </div>
                  
                  <div className="w-full bg-[var(--border)]/20 h-3 rounded-full overflow-hidden relative border border-[var(--border)]/10">
                    <div 
                      className="bg-gradient-to-r from-brand-2 to-[#8b5cf6] h-full rounded-full transition-all duration-1000 shadow-md"
                      style={{ width: `${Math.min(100, Math.round((goal.current_books / goal.target_books) * 100))}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-[10px] font-bold text-[var(--text-main)]/40 uppercase tracking-wider">
                    <span>Começo</span>
                    <span>{Math.min(100, Math.round((goal.current_books / goal.target_books) * 100))}% concluído</span>
                    <span>Objetivo</span>
                  </div>
                </div>
              )}

              {/* Botão de Adicionar Livro */}
              {isOwnProfile && (
                <div className="flex justify-end mb-6">
                  <button
                    onClick={() => setIsAddBookModalOpen(true)}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-2 text-white text-sm font-bold rounded-xl hover:opacity-90 shadow-lg transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Livro
                  </button>
                </div>
              )}

              {/* Categorias da Estante */}
              <div className="space-y-8">
                {['reading', 'want_to_read', 'read'].map((status) => {
                  const books = bookshelf[status as keyof typeof bookshelf];
                  if (!books || books.length === 0) return null;
                  const statusLabel = status === 'reading' ? 'Lendo Atualmente' : status === 'want_to_read' ? 'Quero Ler' : 'Lidos';
                  
                  return (
                    <div key={status}>
                      <h3 className="text-lg font-serif font-bold text-[var(--text-main)] mb-4 border-b border-[var(--border)] pb-2">{statusLabel}</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {books.map((book: any) => (
                          <div key={book.id} className="relative group flex flex-col gap-1">
                            <h4 className="text-xs font-bold text-[var(--text-main)] truncate text-center w-full px-1" title={book.title}>
                              {book.title}
                            </h4>
                            <div className="relative aspect-[2/3] w-full bg-[var(--border)]/20 rounded-lg overflow-hidden shadow-sm">
                              {book.thumbnail ? (
                                <Image src={book.thumbnail} alt={book.title} fill className="object-cover" unoptimized />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center p-2 text-center text-[10px]">
                                  {book.title}
                                </div>
                              )}
                              
                              {/* Overlay de Ações no Hover */}
                              <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-center">
                                <button
                                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedBookDetails(book); }}
                                  className="px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 active:scale-95 border border-zinc-600 shadow-lg"
                                >
                                  <Info className="w-3.5 h-3.5" /> Ver detalhes
                                </button>
                                {isOwnProfile && (
                                  <>
                                    <button
                                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); setBookToRemove(book.id); }}
                                      className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors active:scale-95 absolute top-2 right-2"
                                      title="Remover da estante"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="flex flex-col gap-1 w-full mt-1.5">
                                      {book.status !== 'reading' && (
                                        <button
                                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); updateBookStatus(book.id, 'reading'); }}
                                          className="text-[9px] bg-brand-2 hover:bg-brand-2/95 text-white py-1 px-1 rounded font-bold transition-all active:scale-95"
                                        >
                                          Lendo
                                        </button>
                                      )}
                                      {book.status !== 'want_to_read' && (
                                        <button
                                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); updateBookStatus(book.id, 'want_to_read'); }}
                                          className="text-[9px] bg-zinc-600 hover:bg-zinc-700 text-white py-1 px-1 rounded font-bold transition-all active:scale-95"
                                        >
                                          Quero Ler
                                        </button>
                                      )}
                                      {book.status !== 'read' && (
                                        <button
                                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); updateBookStatus(book.id, 'read'); }}
                                          className="text-[9px] bg-green-600 hover:bg-green-700 text-white py-1 px-1 rounded font-bold transition-all active:scale-95"
                                        >
                                          Lido
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 px-0.5">
                              <p className="text-xs font-bold text-[var(--text-main)] line-clamp-1">{book.title}</p>
                              <p className="text-[10px] text-[var(--text-main)]/60 line-clamp-1">{book.authors?.join(', ')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {(!bookshelf.reading.length && !bookshelf.want_to_read.length && !bookshelf.read.length) && (
                <div className="p-12 text-center text-[var(--text-main)]/40 font-medium italic">Esta estante está vazia. Comece a adicionar livros!</div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-[var(--text-main)]/40 font-medium italic">Estante indisponível.</div>
          )
        ) : isShowingSaved && isLoadingSavedPosts ? (
          <SkeletonPosts />
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
              timeAgo={new Date(post.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
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
      )}

      {/* Modal de Ajustar Meta de Leitura */}
        {isGoalModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden">
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="font-bold text-[var(--text-main)] text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-brand-2" /> Ajustar Meta Anual
                </h3>
                <button onClick={() => setIsGoalModalOpen(false)} className="p-2 rounded-full hover:bg-[var(--border)]/50 transition-colors">
                  <X className="w-4 h-4 text-[var(--text-main)]" />
                </button>
              </div>
              <div className="p-6">
                <label className="text-xs font-bold text-brand-2 uppercase tracking-widest">Meta de Livros lidos</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={editGoalTarget}
                  onChange={(e) => setEditGoalTarget(parseInt(e.target.value, 10) || 1)}
                  className="w-full mt-2 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 transition-all font-bold text-center text-lg"
                />
                <p className="text-xs text-[var(--text-main)]/50 mt-3 text-center">
                  Defina um objetivo saudável para este ano. A meta padrão é 12.
                </p>
              </div>
              <div className="p-4 bg-[var(--border)]/5 border-t border-[var(--border)] flex justify-end gap-3">
                <button
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-5 py-2 rounded-full font-bold text-sm text-[var(--text-main)]/60 hover:bg-[var(--border)]/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveGoal}
                  disabled={isSavingGoal}
                  className="px-6 py-2 rounded-full bg-brand-2 text-white font-bold text-sm hover:opacity-90 shadow-lg disabled:opacity-40 transition-all active:scale-95"
                >
                  {isSavingGoal ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Adicionar Livro à Estante */}
        {isAddBookModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="font-bold text-[var(--text-main)] text-xl flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand-2" /> Adicionar Livro à Estante
                </h3>
                <button onClick={() => { setIsAddBookModalOpen(false); setBookSearchResults([]); setBookSearchQuery(''); }} className="p-2 rounded-full hover:bg-[var(--border)]/50 transition-colors">
                  <X className="w-5 h-5 text-[var(--text-main)]" />
                </button>
              </div>
              
              <form onSubmit={handleBookSearch} className="p-6 border-b border-[var(--border)] bg-[var(--border)]/5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Busque pelo título, autor ou gênero..."
                    value={bookSearchQuery}
                    onChange={(e) => setBookSearchQuery(e.target.value)}
                    className="flex-1 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-main)] text-sm outline-none focus:ring-2 focus:ring-brand-2/30 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isSearchingBooks || bookSearchQuery.trim().length < 2}
                    className="px-5 py-2.5 bg-brand-2 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-1 active:scale-95"
                  >
                    {isSearchingBooks ? <span className="animate-spin">⌛</span> : <Search className="w-4 h-4" />} Buscar
                  </button>
                </div>
              </form>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {bookSearchResults.length > 0 ? (
                  bookSearchResults.map((book) => (
                    <div key={book._id} className="flex gap-4 p-3 bg-[var(--bg-main)]/50 border border-[var(--border)] rounded-2xl items-center hover:bg-[var(--border)]/10 transition-colors">
                      <div className="relative w-14 aspect-[2/3] bg-[var(--border)]/20 rounded-md overflow-hidden flex-shrink-0 shadow-sm">
                        {book.thumbnail ? (
                          <Image src={book.thumbnail} alt="" fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-center p-1">Sem capa</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[var(--text-main)] text-sm truncate">{book.title}</h4>
                        <p className="text-xs text-[var(--text-main)]/60 truncate">{book.authors?.join(', ') || 'Autor desconhecido'}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAddBookToBookshelf(book._id, 'want_to_read')}
                          className="px-2.5 py-1.5 bg-zinc-700 hover:bg-zinc-800 text-[10px] font-bold text-white rounded-lg transition-all active:scale-95"
                        >
                          Quero Ler
                        </button>
                        <button
                          onClick={() => handleAddBookToBookshelf(book._id, 'reading')}
                          className="px-2.5 py-1.5 bg-brand-2 hover:bg-brand-2/90 text-[10px] font-bold text-white rounded-lg transition-all active:scale-95"
                        >
                          Lendo
                        </button>
                        <button
                          onClick={() => handleAddBookToBookshelf(book._id, 'read')}
                          className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-[10px] font-bold text-white rounded-lg transition-all active:scale-95"
                        >
                          Lido
                        </button>
                      </div>
                    </div>
                  ))
                ) : isSearchingBooks ? (
                  <div className="p-8 text-center text-sm text-[var(--text-main)]/50 italic">Pesquisando catálogo...</div>
                ) : bookSearchQuery.trim() ? (
                  <div className="p-8 text-center text-sm text-[var(--text-main)]/50 italic">Nenhum livro correspondente encontrado.</div>
                ) : (
                  <div className="p-8 text-center text-sm text-[var(--text-main)]/40 font-medium italic">Digite para buscar no acervo do LiteraConnect ou da API do Google Books.</div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Modal de Remover Livro */}
        {bookToRemove && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden">
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="font-bold text-[var(--text-main)] text-lg flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-500" /> Remover da Estante
                </h3>
                <button onClick={() => setBookToRemove(null)} className="p-2 rounded-full hover:bg-[var(--border)]/50 transition-colors">
                  <X className="w-4 h-4 text-[var(--text-main)]" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-[var(--text-main)]/80">Deseja realmente remover este livro da sua estante?</p>
              </div>
              <div className="p-4 bg-[var(--border)]/5 border-t border-[var(--border)] flex justify-end gap-3">
                <button
                  onClick={() => setBookToRemove(null)}
                  className="px-5 py-2 rounded-full font-bold text-sm text-[var(--text-main)]/60 hover:bg-[var(--border)]/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmRemoveBook}
                  className="px-6 py-2 rounded-full bg-red-600 text-white font-bold text-sm hover:opacity-90 shadow-lg transition-all active:scale-95"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalhes do Livro */}
        {selectedBookDetails && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[var(--surface)] rounded-3xl shadow-2xl border border-[var(--border)] max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--surface)]/95 backdrop-blur-md z-10">
                <h3 className="font-serif font-bold text-[var(--text-main)] text-xl flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand-2" /> Sobre o Livro
                </h3>
                <button onClick={() => setSelectedBookDetails(null)} className="p-2 rounded-full hover:bg-[var(--border)]/50 transition-colors">
                  <X className="w-5 h-5 text-[var(--text-main)]" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="shrink-0 w-40 mx-auto md:mx-0">
                    <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden shadow-xl border border-[var(--border)]">
                      {selectedBookDetails.thumbnail ? (
                        <Image src={selectedBookDetails.thumbnail} alt={selectedBookDetails.title} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full bg-[var(--border)]/20 flex items-center justify-center text-center p-4 text-sm font-bold">Sem capa</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div>
                      <h2 className="text-2xl font-serif font-bold text-[var(--text-main)] leading-tight">{selectedBookDetails.title}</h2>
                      <p className="text-[var(--text-main)]/60 text-sm mt-1">Por <span className="font-medium text-[var(--text-main)]">{selectedBookDetails.authors?.join(', ') || 'Autor desconhecido'}</span></p>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      {selectedBookDetails.categories?.map((cat: string) => (
                        <span key={cat} className="px-3 py-1 bg-brand-2/10 text-brand-2 text-[10px] font-bold uppercase tracking-wider rounded-full">
                          {cat}
                        </span>
                      ))}
                      {selectedBookDetails.pageCount && (
                        <span className="px-3 py-1 bg-[var(--border)]/20 text-[var(--text-main)]/70 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {selectedBookDetails.pageCount} págs
                        </span>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[var(--border)]/50">
                      <h4 className="text-sm font-bold text-[var(--text-main)] mb-2">Sinopse</h4>
                      {selectedBookDetails.description ? (
                        <p className="text-sm text-[var(--text-main)]/70 leading-relaxed text-justify">
                          {selectedBookDetails.description}
                        </p>
                      ) : (
                        <p className="text-sm text-[var(--text-main)]/40 italic">Nenhuma sinopse disponível para este livro no catálogo.</p>
                      )}
                    </div>

                    <div className="pt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--text-main)]/50">
                      {selectedBookDetails.publishedDate && (
                        <div><strong className="text-[var(--text-main)]/70">Publicação:</strong> {selectedBookDetails.publishedDate}</div>
                      )}
                      {selectedBookDetails.isbn && (
                        <div><strong className="text-[var(--text-main)]/70">ISBN:</strong> {selectedBookDetails.isbn}</div>
                      )}
                    </div>

                    {currentUser && !isOwnProfile && (
                      <div className="pt-4 border-t border-[var(--border)]/50 flex justify-center md:justify-start">
                        <button
                          onClick={async () => {
                            await handleAddBookToBookshelf(selectedBookDetails.id || selectedBookDetails._id, 'want_to_read');
                            setSelectedBookDetails(null);
                          }}
                          className="flex items-center gap-2 bg-brand-2 text-white px-5 py-2.5 rounded-full text-xs font-bold hover:opacity-90 transition-all shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Quero ler</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-brand-2 uppercase tracking-widest">Nome</label>
                  <span className="text-[10px] text-[var(--text-main)]/40">{editName.length}/40</span>
                </div>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full mt-1.5 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 transition-all"
                  maxLength={40}
                />
              </div>

              <div>
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-brand-2 uppercase tracking-widest">@handle</label>
                  <span className="text-[10px] text-[var(--text-main)]/40">{editHandle.length}/10</span>
                </div>
                <input
                  value={editHandle}
                  onChange={(e) => setEditHandle(e.target.value)}
                  className="w-full mt-1.5 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 transition-all"
                  maxLength={10}
                />
              </div>

              <div>
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-brand-2 uppercase tracking-widest">Bio</label>
                  <span className="text-[10px] text-[var(--text-main)]/40">{editBio.length}/350</span>
                </div>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full mt-1.5 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-2/30 min-h-28 resize-none transition-all"
                  maxLength={350}
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
