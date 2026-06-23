import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const { setSession, clearSession } = useAuthStore();
  const router = useRouter();

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      if (!data.user) throw new Error('No user data returned');

      // Fetch user profile from database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw profileError;

      setSession(data.user, profile);
      toast.success('Welcome to SparkChat!');
      router.push('/');
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to log in');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    displayName: string,
    username: string,
    phone?: string
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            username: username.toLowerCase(),
            phone: phone || null,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user data returned');

      // If email confirmation is required, session will be null
      if (!data.session) {
        toast.success('Check your email to confirm your account!');
        router.push('/login?confirm=true');
        return;
      }

      // Wait for the DB trigger to create the profile
      let profile = null;
      for (let i = 0; i < 8; i++) {
        const { data: p } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        if (p) { profile = p; break; }
        await new Promise((r) => setTimeout(r, 500));
      }

      setSession(data.user, profile);
      toast.success('Welcome to SparkChat! 🎉');
      router.push('/');
      router.refresh();
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error?.message || 'Failed to sign up');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      clearSession();
      toast.success('Logged out successfully');
      router.push('/login');
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    signup,
    logout,
    loading,
  };
}
