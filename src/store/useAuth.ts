import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateBankConnection: (hasConnected: boolean) => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      // Set up auth state listener FIRST
      supabase.auth.onAuthStateChange(
        async (event, session) => {
          set({ session, user: session?.user ?? null });
          
          if (session?.user) {
            // Defer profile fetch to avoid potential deadlock
            setTimeout(() => {
              get().fetchProfile();
            }, 0);
          } else {
            set({ profile: null });
          }
        }
      );

      // THEN check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      set({ 
        session, 
        user: session?.user ?? null,
        isLoading: false,
        isInitialized: true 
      });

      if (session?.user) {
        await get().fetchProfile();
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  signUp: async (email: string, password: string, fullName?: string) => {
    try {
      set({ isLoading: true });
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: fullName ? { full_name: fullName } : undefined
        }
      });

      set({ isLoading: false });
      
      if (error) {
        return { error: error.message };
      }
      
      return { error: null };
    } catch (error) {
      set({ isLoading: false });
      return { error: 'An unexpected error occurred' };
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      set({ isLoading: false });
      
      if (error) {
        return { error: error.message };
      }
      
      return { error: null };
    } catch (error) {
      set({ isLoading: false });
      return { error: 'An unexpected error occurred' };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null, profile: null });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },

  fetchProfile: async () => {
    try {
      const { user } = get();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      set({ profile });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  },

  updateBankConnection: async (hasConnected: boolean) => {
    try {
      const { user, profile } = get();
      if (!user || !profile) return;

      const { error } = await supabase
        .from('profiles')
        .update({ has_connected_bank: hasConnected })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating bank connection:', error);
        return;
      }

      // Update local profile state
      set({ 
        profile: { 
          ...profile, 
          has_connected_bank: hasConnected 
        } 
      });
    } catch (error) {
      console.error('Error updating bank connection:', error);
    }
  }
}));