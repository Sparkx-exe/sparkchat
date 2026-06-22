import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/types';
import { supabase } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (user: User | null, profile: Profile | null) => void;
  setProfile: (profile: Profile | null) => void;
  clearSession: () => void;
  fetchProfile: (userId: string) => Promise<Profile | null>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setSession: (user, profile) => set({ user, profile, loading: false }),
  setProfile: (profile) => set({ profile }),
  clearSession: () => set({ user: null, profile: null, loading: false }),
  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        set({ profile: data as Profile });
        return data as Profile;
      }
      return null;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  },
}));
