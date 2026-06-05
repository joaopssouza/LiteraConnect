'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { getLocalAvatar } from '@/lib/avatar';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  onlineUserIds: string[];
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
  onlineUserIds: [],
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const globalPresenceRef = useRef<any>(null);

  const ensureUserProfile = async (authUser: User) => {
    try {
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // User not found, create default profile
        const name = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário';
        const handle = authUser.user_metadata?.handle || `user_${Math.floor(Math.random() * 1000000)}`;
        
        const { data: newData, error: insertError } = await supabase.from('users').insert([
          {
            id: authUser.id,
            name: name,
            handle: handle,
            avatar_url: authUser.user_metadata?.avatar_url || getLocalAvatar(authUser.id, 150),
            bio: 'Olá! Estou usando o LiteraConnect para compartilhar minhas leituras.',
            birth_date: authUser.user_metadata?.birth_date ? new Date(authUser.user_metadata.birth_date).toISOString().split('T')[0] : null,
            gender: authUser.user_metadata?.gender || null
          }
        ]).select().single();
        
        if (!insertError && newData) {
          data = newData;
        }
      }
      
      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error ensuring user profile:', err);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        ensureUserProfile(session.user);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        ensureUserProfile(session.user);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    if (!user) return;
    
    // Configura a presença global
    const syncPresence = () => {
      if (!globalPresenceRef.current) return;
      const state = globalPresenceRef.current.presenceState();
      setOnlineUserIds(Array.from(new Set(Object.values(state).flat().map((p: any) => p.user_id).filter(Boolean))));
    };

    if (globalPresenceRef.current) {
      supabase.removeChannel(globalPresenceRef.current);
    }

    const ch = supabase
      .channel('online:users', { config: { presence: { key: user.id } } })
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({ user_id: user.id });
          syncPresence();
        }
      });

    globalPresenceRef.current = ch;

    return () => {
      if (globalPresenceRef.current) {
        supabase.removeChannel(globalPresenceRef.current);
        globalPresenceRef.current = null;
      }
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, session, profile, isLoading, signOut, onlineUserIds }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
