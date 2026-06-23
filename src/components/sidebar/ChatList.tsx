import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import ChatListItem from './ChatListItem';
import ChatListSkeleton from './ChatListSkeleton';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Conversation, Message } from '@/types';

// ─── Optimised query: only the LAST message per conversation ───────────────────
const CONVERSATION_SELECT = `
  *,
  members:conversation_members(
    *,
    profile:profiles(*)
  ),
  last_message:messages(
    id, conversation_id, sender_id, content, type,
    media_name, media_url, is_deleted, created_at,
    sender:profiles!messages_sender_id_fkey(display_name, avatar_url)
  )
`;

export const ChatList: React.FC = () => {
  const { conversations, setConversations, updateConversation, activeConversationId, activeFolderId } = useChatStore();
  const { user } = useAuthStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Parse raw Supabase row into the shape our store expects ────────────────
  const parseConversation = useCallback((conv: any): Conversation => {
    // For direct chats derive name/avatar from the other member's profile
    if (conv.type === 'direct') {
      const otherMember = conv.members?.find((m: any) => m.user_id !== user?.id);
      if (otherMember?.profile) {
        conv.name = otherMember.profile.display_name;
        conv.avatar_url = otherMember.profile.avatar_url;
        conv.avatar_blurhash = otherMember.profile.avatar_blurhash;
      }
    }

    // last_message comes back as an array; take the last item
    const msgs: Message[] = conv.last_message || [];
    conv.last_message = msgs.length > 0 ? msgs[msgs.length - 1] : null;

    return conv as Conversation;
  }, [user?.id]);

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select(CONVERSATION_SELECT)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setConversations((data || []).map(parseConversation));
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchFolders = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_folders')
          .select('*')
          .order('sort_order', { ascending: true });

        if (error) throw error;
        useChatStore.getState().setFolders(data || []);
      } catch (err) {
        console.error('Error fetching folders:', err);
      }
    };

    fetchConversations();
    fetchFolders();
  }, [user, setConversations, parseConversation]);

  // Keep refs of conversations and parseConversation to avoid resetting the realtime listener on every list update
  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const parseConversationRef = useRef(parseConversation);
  useEffect(() => {
    parseConversationRef.current = parseConversation;
  }, [parseConversation]);

  // ── Realtime: re-fetch & update the sidebar whenever a new message lands ──
  useEffect(() => {
    if (!user) return;

    // Re-fetch a single conversation by ID and update store
    const refreshConversation = async (conversationId: string) => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select(CONVERSATION_SELECT)
          .eq('id', conversationId)
          .single();

        if (error || !data) return;
        updateConversation(conversationId, parseConversationRef.current(data));
      } catch {
        // non-fatal
      }
    };

    // Listen to any new INSERT on messages where I'm a member
    const channel = supabase
      .channel('chatlist-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const convId = payload.new.conversation_id as string;
          // Only update if I'm a member of that conversation
          if (conversationsRef.current.some((c) => c.id === convId)) {
            refreshConversation(convId);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const convId = payload.new.conversation_id as string;
          if (conversationsRef.current.some((c) => c.id === convId)) {
            refreshConversation(convId);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          const convId = payload.new.id as string;
          if (conversationsRef.current.some((c) => c.id === convId)) {
            refreshConversation(convId);
          }
        }
      )
      // Listen to new conversations where I am added as a member
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const convId = payload.new.conversation_id as string;
          refreshConversation(convId);
        }
      )
      // Listen to membership deletions (leaving or being kicked from a group)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'conversation_members',
        },
        (payload) => {
          const deletedMemberId = payload.old.id;
          const { conversations, setConversations, activeConversationId, setActiveConversationId } = useChatStore.getState();
          
          const targetConv = conversationsRef.current.find((c) =>
            c.members?.some((m) => m.id === deletedMemberId)
          );

          if (targetConv) {
            const wasMe = targetConv.members?.some((m) => m.id === deletedMemberId && m.user_id === user.id);
            if (wasMe) {
              setConversations(conversationsRef.current.filter((c) => c.id !== targetConv.id));
              if (activeConversationId === targetConv.id) {
                setActiveConversationId(null);
              }
            } else {
              refreshConversation(targetConv.id);
            }
          }
        }
      )
      // Online/offline presence changes
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => {
          // Lightweight: just re-parse from current store without a fetch
          setConversations([...conversationsRef.current].map(parseConversationRef.current));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, updateConversation, setConversations]);

  // ── Filter & sort ─────────────────────────────────────────────────────────
  const { folders } = useChatStore();
  const activeFolder = folders.find((f) => f.id === activeFolderId);
  const filteredConversations = conversations.filter((c) => {
    if (c.is_archived) return false;
    if (!activeFolder) return true;
    return activeFolder.include_types?.includes(c.type) || false;
  });

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const aMember = a.members?.find((m) => m.user_id === user?.id);
    const bMember = b.members?.find((m) => m.user_id === user?.id);

    const aPinned = aMember?.is_pinned ? 1 : 0;
    const bPinned = bMember?.is_pinned ? 1 : 0;

    if (aPinned !== bPinned) return bPinned - aPinned;

    const aTime = a.last_message?.created_at || a.updated_at;
    const bTime = b.last_message?.created_at || b.updated_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  // ── Virtualizer ───────────────────────────────────────────────────────────
  const rowVirtualizer = useVirtualizer({
    count: sortedConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  if (isLoading && conversations.length === 0) return <ChatListSkeleton />;

  if (conversations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center select-none">
        <p className="text-sm font-semibold text-text-primary mb-1">No chats yet</p>
        <p className="text-xs text-text-secondary max-w-[200px]">
          Search for users in the search bar to start a conversation!
        </p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-y-auto w-full select-none">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const conversation = sortedConversations[virtualRow.index];
          return (
            <div
              key={conversation.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ChatListItem
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default ChatList;
