import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Search, Phone, MoreVertical, Video, BellOff, ShieldAlert } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export const ChatHeader: React.FC = () => {
  const { conversations, activeConversationId, setActiveConversationId, setCallState, messageSearchOpen, setMessageSearchOpen, callState } = useChatStore();
  const { isMobileView, setIsSidebarVisible, setRightPanel, rightPanelOpen } = useUIStore();
  const { user, profile } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [activeGroupParticipants, setActiveGroupParticipants] = useState<any[]>([]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const conversation = conversations.find((c) => c.id === activeConversationId);

  // Subscribe to group call presence status — only when there is no active call.
  // When callState is set, CallOverlay takes ownership of the same Supabase channel
  // (same name = same object in the Supabase JS client). If ChatHeader keeps its
  // own subscription open, CallOverlay would receive a pre-subscribed channel and
  // crash with "cannot add presence callbacks after subscribe()".
  useEffect(() => {
    if (!activeConversationId || !conversation || conversation.type !== 'group' || !user || callState) {
      // If a call just started, clear stale participant list so the banner hides cleanly.
      if (callState) {
        setActiveGroupParticipants([]);
        if (activeConversationId) {
          useChatStore.getState().setActiveGroupCallParticipants(activeConversationId, []);
        }
      }
      return;
    }

    const channel = supabase.channel(`group-call:${activeConversationId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const participants: any[] = [];
        Object.keys(presenceState).forEach((key) => {
          const presArray = presenceState[key];
          if (Array.isArray(presArray)) {
            presArray.forEach((pres: any) => {
              participants.push(pres);
            });
          }
        });
        setActiveGroupParticipants(participants);
        useChatStore.getState().setActiveGroupCallParticipants(activeConversationId, participants);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      useChatStore.getState().setActiveGroupCallParticipants(activeConversationId, []);
    };
  }, [activeConversationId, conversation, user, callState]);

  if (!conversation) {
    return (
      <header className="px-4 py-2 bg-bg-sidebar border-b border-divider flex items-center gap-3 shrink-0 h-[52px] animate-pulse">
        <div className="w-8 h-8 rounded-full bg-bg-hover" />
        <div className="flex flex-col gap-1.5">
          <div className="w-28 h-2.5 rounded bg-bg-hover" />
          <div className="w-16 h-2 rounded bg-bg-hover" />
        </div>
      </header>
    );
  }

  const otherMember = conversation.members?.find((m) => m.user_id !== user?.id);
  const isOnline = conversation.type === 'direct' && otherMember?.profile?.is_online;

  const handleBack = () => {
    setActiveConversationId(null);
    setIsSidebarVisible(true);
  };

  const handleHeaderClick = () => {
    setRightPanel(!rightPanelOpen, conversation.type === 'group' ? 'group_info' : 'user_info');
  };

  const initiateCall = async (type: 'voice' | 'video') => {
    if (!activeConversationId || !user || !profile) return;

    if (conversation.type === 'group') {
      setCallState({
        type,
        conversationId: activeConversationId,
        status: 'active',
        isOutgoing: true,
        callPartnerId: '',
        isGroupCall: true,
      });

      // Insert system/call log message to announce the call in the chat feed
      try {
        await supabase.from('messages').insert({
          conversation_id: activeConversationId,
          sender_id: user.id,
          content: type === 'video' ? 'video' : 'voice',
          type: 'call',
          media_name: 'group_started',
        });
      } catch (err) {
        console.error('Failed to log group call start:', err);
      }
      return;
    }

    const receiverId = otherMember?.user_id;
    if (!receiverId) {
      toast.error('Cannot call here');
      return;
    }

    // Show outgoing call UI for the caller immediately
    setCallState({
      type,
      conversationId: activeConversationId,
      status: 'ringing',
      isOutgoing: true,
      callPartnerId: receiverId,
    });

    // Broadcast the incoming call signal to the receiver via their personal channel
    const signalChannel = supabase.channel(`call-signal:${receiverId}`);
    await signalChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await signalChannel.send({
          type: 'broadcast',
          event: 'call_incoming',
          payload: {
            callType: type,
            conversationId: activeConversationId,
            fromUserId: user.id,
            fromName: profile.display_name,
            fromAvatar: profile.avatar_url,
          },
        });
        // Unsubscribe after sending — the channel stays open long enough
        setTimeout(() => supabase.removeChannel(signalChannel), 3000);
      }
    });
  };

  const handleCall = () => {
    initiateCall('voice');
  };

  const handleVideoCall = () => {
    initiateCall('video');
    setDropdownOpen(false);
  };

  const handleMute = async () => {
    try {
      if (!user) return;
      const myMember = conversation.members?.find((m) => m.user_id === user.id);
      await supabase
        .from('conversation_members')
        .update({ is_muted: !myMember?.is_muted })
        .eq('conversation_id', conversation.id)
        .eq('user_id', user.id);
      toast.success(myMember?.is_muted ? 'Notifications enabled' : 'Notifications muted');
    } catch {
      toast.error('Failed to update notification settings');
    }
    setDropdownOpen(false);
  };

  const handleDeleteChat = () => {
    toast('Delete chat from the chat list (right-click)', { icon: '🗑️' });
    setDropdownOpen(false);
  };

  return (
    <div className="flex flex-col w-full shrink-0">
      <header className="px-4 py-2 bg-bg-sidebar border-b border-divider flex items-center justify-between select-none relative z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button on mobile view */}
          {isMobileView && (
            <button
              onClick={handleBack}
              className="p-1 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          {/* Conversation details trigger info panel */}
          <div
            onClick={handleHeaderClick}
            className="flex items-center gap-3 cursor-pointer min-w-0"
          >
            <Avatar
              name={conversation.name || 'Chat'}
              src={conversation.avatar_url}
              size="sm"
              isOnline={isOnline || false}
            />
            <div className="overflow-hidden">
              <h3 className="text-xs sm:text-sm font-semibold text-text-primary truncate">
                {conversation.name}
              </h3>
              <p className="text-[10px] text-text-secondary truncate">
                {conversation.type === 'group'
                  ? `${conversation.members?.length || 0} members`
                  : isOnline
                  ? 'online'
                  : 'offline'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Header Menu buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Search toggle */}
          <button
            onClick={() => setMessageSearchOpen(!messageSearchOpen)}
            className={`p-1.5 rounded-full transition-colors focus:outline-none ${
              messageSearchOpen
                ? 'bg-accent text-white'
                : 'hover:bg-bg-hover text-text-secondary hover:text-text-primary'
            }`}
          >
            <Search size={16} />
          </button>

          {/* Voice call */}
          {(conversation.type === 'direct' || conversation.type === 'group') && (
            <button
              onClick={handleCall}
              className="p-1.5 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
            >
              <Phone size={16} />
            </button>
          )}

          {/* Video call */}
          {(conversation.type === 'direct' || conversation.type === 'group') && (
            <button
              onClick={handleVideoCall}
              className="p-1.5 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none hidden sm:flex"
            >
              <Video size={16} />
            </button>
          )}

          {/* Dropdown Options */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="p-1.5 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
            >
              <MoreVertical size={16} />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5, originX: 1, originY: 0 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                  className="absolute right-0 top-8 w-44 bg-bg-elevated border border-border shadow-lg rounded-md z-20 py-1"
                >
                  {(conversation.type === 'direct' || conversation.type === 'group') && (
                    <button
                      onClick={handleVideoCall}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-bg-hover text-2xs sm:text-xs text-text-primary transition-colors text-left sm:hidden"
                    >
                      <Video size={13} className="text-text-secondary" />
                      <span>Video Call</span>
                    </button>
                  )}

                  <button
                    onClick={handleMute}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-bg-hover text-2xs sm:text-xs text-text-primary transition-colors text-left"
                  >
                    <BellOff size={13} className="text-text-secondary" />
                    <span>
                      {conversation.members?.find((m) => m.user_id === user?.id)?.is_muted
                        ? 'Unmute'
                        : 'Mute'}
                    </span>
                  </button>

                  <button
                    onClick={handleDeleteChat}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-bg-hover text-2xs sm:text-xs text-danger hover:text-danger-hover transition-colors text-left font-medium"
                  >
                    <ShieldAlert size={13} />
                    <span>Delete Chat</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Active Group Call Banner */}
      {conversation.type === 'group' && activeGroupParticipants.length > 0 && !callState && (
        <div className="bg-accent/10 border-b border-divider px-4 py-1.5 flex items-center justify-between text-xs select-none relative z-10 shrink-0">
          <div className="flex items-center gap-2 text-text-primary font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span>
              Active {activeGroupParticipants[0]?.is_video ? 'video' : 'voice'} call ({activeGroupParticipants.length} joined)
            </span>
          </div>
          <button
            onClick={() => {
              setCallState({
                type: activeGroupParticipants[0]?.is_video ? 'video' : 'voice',
                conversationId: activeConversationId as string,
                status: 'active',
                isOutgoing: false,
                callPartnerId: '',
                isGroupCall: true,
              });
            }}
            className="px-3.5 py-1 bg-accent hover:bg-accent-hover text-white rounded-full text-[10px] font-semibold transition-colors flex items-center justify-center shrink-0"
          >
            Join Call
          </button>
        </div>
      )}
    </div>
  );
};
export default ChatHeader;
