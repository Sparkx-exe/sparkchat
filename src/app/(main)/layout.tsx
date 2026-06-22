'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { useThemeStore } from '@/stores/themeStore';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/sidebar/Sidebar';
import RightPanelWrapper from '@/components/panels/RightPanelWrapper';
import CreateGroupModal from '@/components/modals/CreateGroupModal';
import EditProfileModal from '@/components/profile/EditProfileModal';
import { Toaster } from 'react-hot-toast';
import { Spinner } from '@/components/ui/Spinner';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, setSession } = useAuthStore();
  const { setTheme } = useThemeStore();
  const { activeConversationId } = useChatStore();
  const {
    isMobileView,
    setIsMobileView,
    isSidebarVisible,
    setIsSidebarVisible,
    rightPanelOpen,
  } = useUIStore();
  const router = useRouter();

  // Session guard and listener
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: p, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileErr) throw profileErr;
        setSession(session.user, p);
      } catch (err) {
        console.error('Session guard error:', err);
        setSession(null, null);
        router.push('/login');
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const { data: p } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setSession(session.user, p);
        } else {
          setSession(null, null);
          router.push('/login');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setSession, router]);

  // Window resize & viewport listeners
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileView(isMobile);
      
      if (isMobile) {
        setIsSidebarVisible(!activeConversationId);
      } else {
        setIsSidebarVisible(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeConversationId, setIsMobileView, setIsSidebarVisible]);

  // Sync theme configurations on mount
  useEffect(() => {
    const localTheme = localStorage.getItem('sparkchat-theme') as 'light' | 'dark' | null;
    const initialTheme = localTheme || 'dark';
    setTheme(initialTheme);
  }, [setTheme]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-text-secondary animate-pulse">
            Warming up SparkChat...
          </p>
        </div>
      </div>
    );
  }

  // Render variables for panel layouts
  const showSidebar = !isMobileView || (isMobileView && isSidebarVisible);
  const showChat = !isMobileView || (isMobileView && !isSidebarVisible && !rightPanelOpen);
  const showRightPanel = rightPanelOpen && (!isMobileView || (isMobileView && !isSidebarVisible));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary text-text-primary">
      <Toaster position="top-right" />
      
      {/* Sidebar Panel */}
      {showSidebar && <Sidebar />}

      {/* Main Chat Area */}
      {showChat && (
        <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-bg-chat">
          {children}
        </div>
      )}

      {/* Right Detail Panel */}
      {showRightPanel && <RightPanelWrapper />}

      {/* Toggled Dialog Modals */}
      <CreateGroupModal />
      <EditProfileModal />
    </div>
  );
}
