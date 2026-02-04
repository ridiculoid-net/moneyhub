import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authEnabled: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const getRedirectUrl = (): string | undefined => {
  const envRedirect = import.meta.env.VITE_SUPABASE_REDIRECT_URL as string | undefined;
  if (envRedirect) return envRedirect;
  if (typeof window !== 'undefined') return window.location.origin;
  return undefined;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const authEnabled = Boolean(supabase);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(authEnabled);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session ?? null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession ?? null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [authEnabled]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    const redirectTo = getRedirectUrl();
    if (redirectTo) {
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      return;
    }
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    authEnabled,
    signInWithGoogle,
    signOut,
  }), [session, loading, authEnabled, signInWithGoogle, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
