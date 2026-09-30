import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { UserProfile, Address } from '../types';
import { cleanUndefined } from '../utils';

export type AppUser = {
  uid: string;
  id?: string;
  email: string | null;
  displayName: string | null;
  phoneNumber?: string | null;
  emailVerified?: boolean;
  isAnonymous?: boolean;
};

const LOCAL_AUTH_SESSION_KEY = 'maestria_auth_session';
const LOCAL_USERS_KEY = 'maestria_local_users';

interface AuthContextType {
  user: AppUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserAddress: (address: Address) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  updateProfile: (fields: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Generate deterministic local UID from email
function getDeterministicLocalUid(email: string): string {
  let hash = 0;
  const str = email.trim().toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `usr_${Math.abs(hash).toString(36)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  // Helper to handle Supabase user profile resolution
  const handleSupabaseUser = async (sbUser: any) => {
    const email = sbUser.email || '';
    const isLuanSena = email && email.toLowerCase() === 'luansena.010@gmail.com';
    const isMaestriaGrill = email && email.toLowerCase() === 'maestriagrill@gmail.com';

    let prof: UserProfile | null = null;
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', sbUser.id).single();
      if (data) {
        prof = {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone || '',
          role: data.role || (isMaestriaGrill ? 'superadmin' : (isLuanSena ? 'admin' : 'cliente')),
          address: data.address,
          createdAt: data.created_at || new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn('Could not load Supabase profile from table:', e);
    }

    if (!prof) {
      prof = {
        id: sbUser.id,
        name: sbUser.user_metadata?.name || email.split('@')[0] || 'Cliente',
        email,
        phone: sbUser.user_metadata?.phone || '',
        role: isMaestriaGrill ? 'superadmin' : (isLuanSena ? 'admin' : 'cliente'),
        createdAt: new Date().toISOString(),
      };
      try {
        await supabase.from('profiles').upsert(prof);
      } catch {}
    }

    const appUser: AppUser = {
      uid: sbUser.id,
      id: sbUser.id,
      email,
      displayName: prof.name,
      phoneNumber: prof.phone,
      emailVerified: true,
      isAnonymous: false,
    };

    setUser(appUser);
    setProfile(prof);
    localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify({ user: appUser, profile: prof }));
    setLoading(false);
  };

  const checkLocalSession = () => {
    try {
      const rawSession = localStorage.getItem(LOCAL_AUTH_SESSION_KEY);
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed?.user && parsed?.profile) {
          setUser(parsed.user);
          setProfile(parsed.profile);
          setLoading(false);
          return;
        }
      }
    } catch {}
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  useEffect(() => {
    if (isSupabaseConfigured) {
      // 1. Check existing Supabase session
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          await handleSupabaseUser(session.user);
        } else {
          checkLocalSession();
        }
      }).catch(() => {
        checkLocalSession();
      });

      // 2. Listen to Supabase auth events
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await handleSupabaseUser(session.user);
        } else {
          checkLocalSession();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      checkLocalSession();
    }
  }, []);

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim();
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        // If user not found in Supabase Auth or invalid credentials
        throw error;
      }

      if (data.user) {
        await handleSupabaseUser(data.user);
        return;
      }
    }

    // Local / Offline fallback login if Supabase is not configured or in development
    const isLuanSena = cleanEmail.toLowerCase() === 'luansena.010@gmail.com';
    const isMaestriaGrill = cleanEmail.toLowerCase() === 'maestriagrill@gmail.com';
    const uid = getDeterministicLocalUid(cleanEmail);

    let localProfile: UserProfile | null = null;
    try {
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
      if (localUsers[uid]) {
        localProfile = localUsers[uid];
      }
    } catch {}

    if (!localProfile) {
      localProfile = {
        id: uid,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: '',
        createdAt: new Date().toISOString(),
        role: isMaestriaGrill ? 'superadmin' : (isLuanSena ? 'admin' : 'cliente'),
      };
      try {
        const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
        localUsers[uid] = localProfile;
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
      } catch {}
    }

    const localUser: AppUser = {
      uid,
      id: uid,
      email: cleanEmail,
      displayName: localProfile.name,
      phoneNumber: localProfile.phone,
      emailVerified: true,
      isAnonymous: false,
    };

    setUser(localUser);
    setProfile(localProfile);
    localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify({ user: localUser, profile: localProfile }));
  };

  const register = async (name: string, email: string, phone: string, password: string) => {
    const cleanEmail = email.trim();
    const isLuanSena = cleanEmail.toLowerCase() === 'luansena.010@gmail.com';
    const isMaestriaGrill = cleanEmail.toLowerCase() === 'maestriagrill@gmail.com';

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name, phone },
        },
      });

      if (error) throw error;

      if (data.user) {
        const newProfile: UserProfile = {
          id: data.user.id,
          name,
          email: cleanEmail,
          phone,
          createdAt: new Date().toISOString(),
          role: isMaestriaGrill ? 'superadmin' : (isLuanSena ? 'admin' : 'cliente'),
        };
        try {
          await supabase.from('profiles').upsert(newProfile);
        } catch (e) {
          console.warn('Could not upsert profile to Supabase:', e);
        }
        await handleSupabaseUser(data.user);
        return;
      }
    }

    // Local / Offline fallback registration
    const uid = getDeterministicLocalUid(cleanEmail);
    const newProfile: UserProfile = {
      id: uid,
      name,
      email: cleanEmail,
      phone,
      createdAt: new Date().toISOString(),
      role: isMaestriaGrill ? 'superadmin' : (isLuanSena ? 'admin' : 'cliente'),
    };

    const localUser: AppUser = {
      uid,
      id: uid,
      email: cleanEmail,
      displayName: name,
      phoneNumber: phone,
      emailVerified: true,
      isAnonymous: false,
    };

    try {
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
      localUsers[uid] = newProfile;
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
    } catch {}

    setUser(localUser);
    setProfile(newProfile);
    localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify({ user: localUser, profile: newProfile }));
  };

  const resetPassword = async (email: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      return;
    }
    console.log('Reset password request for:', email);
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut error:', e);
      }
    }
    localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
    setUser(null);
    setProfile(null);
  };

  const updateUserAddress = async (address: Address) => {
    if (!user) return;
    const cleanedAddress = cleanUndefined(address);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update({ address: cleanedAddress }).eq('id', user.uid);
      } catch (e) {
        console.warn('Error updating address in Supabase:', e);
      }
    }

    setProfile((prev) => {
      const updated = prev ? { ...prev, address: cleanedAddress } : null;
      if (updated) {
        try {
          const raw = localStorage.getItem(LOCAL_AUTH_SESSION_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify({ ...parsed, profile: updated }));
          }
        } catch {}
      }
      return updated;
    });
  };

  const updateProfile = async (fields: Partial<UserProfile>) => {
    if (!user) return;
    const cleaned = cleanUndefined(fields);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update(cleaned).eq('id', user.uid);
      } catch (e) {
        console.warn('Error updating profile in Supabase:', e);
      }
    }

    setProfile((prev) => {
      const updated = prev ? { ...prev, ...fields } : null;
      if (updated) {
        try {
          const raw = localStorage.getItem(LOCAL_AUTH_SESSION_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            localStorage.setItem(LOCAL_AUTH_SESSION_KEY, JSON.stringify({ ...parsed, profile: updated }));
          }
        } catch {}
      }
      return updated;
    });
  };

  const loginWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('O Supabase ainda não está configurado. Configure a URL e a Anon Key do Supabase para ativar o login com Google.');
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        register,
        resetPassword,
        logout,
        updateUserAddress,
        loginWithGoogle,
        isAuthOpen,
        setIsAuthOpen,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
