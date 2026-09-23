import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserRole = 'inspector' | 'admin';

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
      } else {
        setProfile({
          id: userId,
          full_name: 'Inspector Sharma',
          role: 'inspector',
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      setProfile({
        id: userId,
        full_name: 'Inspector Sharma',
        role: 'inspector',
        created_at: new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then((res: { data?: { session?: Session | null } }) => {
        const data = res?.data;
        setSession(data?.session ?? null);
        if (data?.session?.user) {
          fetchProfile(data.session.user.id).finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, newSession: Session | null) => {
      (async () => {
        setSession(newSession);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error?.message ?? 'Sign in failed' };
      if (data?.session) {
        setSession(data.session);
        if (data.session.user) {
          await fetchProfile(data.session.user.id);
        }
      }
      return { error: null };
    },
    [fetchProfile]
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return { error: error.message };
      if (data?.user) {
        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          role: 'inspector',
        });
        if (data.session) {
          setSession(data.session);
          setProfile({
            id: data.user.id,
            full_name: fullName,
            role: 'inspector',
            created_at: new Date().toISOString(),
          });
        }
      }
      return { error: null };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
