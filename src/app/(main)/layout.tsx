'use client';

import React, { useEffect, useRef } from 'react';
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
import SettingsModal from '@/components/modals/SettingsModal';
import NewChatModal from '@/components/modals/NewChatModal';
import ContactsModal from '@/components/modals/ContactsModal';
import ChatFoldersModal from '@/components/modals/ChatFoldersModal';
import CallOverlay from '@/components/chat/CallOverlay';
import { Toaster } from 'react-hot-toast';
import { Spinner } from '@/components/ui/Spinner';
import { AnimatePresence } from 'framer-motion';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, setSession } = useAuthStore();
  const { setTheme } = useThemeStore();
  const { activeConversationId, setCallState, callState } = useChatStore();
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
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (!session) { router.push('/login'); return; }

        const { data: p } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!mounted) return;
        if (!p) { router.push('/login'); return; }
        setSession(session.user, p);
      } catch (err) {
        console.error('Session error:', err);
        if (mounted) { setSession(null, null); router.push('/login'); }
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        // SIGNED_OUT: clear session and redirect
        if (event === 'SIGNED_OUT' || !session) {
          setSession(null, null);
          router.push('/login');
          return;
        }
        // TOKEN_REFRESHED: session updated but no need to re-fetch profile
        if (event === 'TOKEN_REFRESHED') return;
        // SIGNED_IN: only re-fetch if we don't already have the user
        if (event === 'SIGNED_IN') {
          const { data: p } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (mounted) setSession(session.user, p ?? null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, router]);

  // Keep callState in a ref to avoid stale closures in the broadcast signal listener callbacks
  const callStateRef = useRef(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Global incoming call listener — each user subscribes to their own call-signal channel
  useEffect(() => {
    if (!user) return;

    const callChannel = supabase
      .channel(`call-signal:${user.id}`)
      .on('broadcast', { event: 'call_incoming' }, (payload) => {
        // Don't show incoming if already in a call
        if (callStateRef.current) return;
        const { callType, conversationId, fromUserId } = payload.payload as {
          callType: 'voice' | 'video';
          conversationId: string;
          fromUserId: string;
        };
        setCallState({
          type: callType,
          conversationId,
          status: 'ringing',
          isOutgoing: false,
          callPartnerId: fromUserId,
        });
      })
      .on('broadcast', { event: 'call_ended' }, () => {
        setCallState(null);
      })
      .on('broadcast', { event: 'call_accepted' }, () => {
        setCallState(callStateRef.current ? { ...callStateRef.current, status: 'active' } : null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(callChannel);
    };
  }, [user, setCallState]); // intentionally exclude callState to avoid resubscribing

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
      <AnimatePresence>
        {showRightPanel && <RightPanelWrapper />}
      </AnimatePresence>

      {/* Toggled Dialog Modals */}
      <CreateGroupModal />
      <EditProfileModal />
      <SettingsModal />
      <NewChatModal />
      <ContactsModal />
      <ChatFoldersModal />
      <CallOverlay />
    </div>
  );
}
