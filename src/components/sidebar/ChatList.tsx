import React, { useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import ChatListItem from './ChatListItem';
import ChatListSkeleton from './ChatListSkeleton';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export const ChatList: React.FC = () => {
  const { conversations, setConversations, activeConversationId, activeFolderId } = useChatStore();
  const { user } = useAuthStore();
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            *,
            members:conversation_members(
              *,
              profile:profiles(*)
            ),
            messages(
              *,
              sender:profiles(*)
            )
          `)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        
        const parsedConversations = data.map((conv: any) => {
          if (conv.type === 'direct') {
            const otherMember = conv.members.find((m: any) => m.user_id !== user.id);
            if (otherMember && otherMember.profile) {
              conv.name = otherMember.profile.display_name;
              conv.avatar_url = otherMember.profile.avatar_url;
              conv.avatar_blurhash = otherMember.profile.avatar_blurhash;
            }
          }
          
          const convMessages = conv.messages || [];
          conv.last_message = convMessages.length > 0 ? convMessages[convMessages.length - 1] : null;
          
          return conv;
        });

        setConversations(parsedConversations);
      } catch (err) {
        console.error('Error fetching conversations:', err);
      }
    };

    fetchConversations();
  }, [user, setConversations]);

  // Filter conversations by active folder
  const filteredConversations = conversations.filter((c) => {
    if (activeFolderId === null) {
      return !c.is_archived;
    }
    // Simple filter simulation for custom folders
    return !c.is_archived;
  });

  // Sort pinned first, then updated_at DESC
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const aMember = a.members?.find((m) => m.user_id === user?.id);
    const bMember = b.members?.find((m) => m.user_id === user?.id);
    
    const aPinned = aMember?.is_pinned ? 1 : 0;
    const bPinned = bMember?.is_pinned ? 1 : 0;
    
    if (aPinned !== bPinned) {
      return bPinned - aPinned;
    }
    
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const rowVirtualizer = useVirtualizer({
    count: sortedConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // 64px tall items
    overscan: 5,
  });

  if (conversations.length === 0) {
    return <ChatListSkeleton />;
  }

  return (
    <div
      ref={parentRef}
      className="h-full overflow-y-auto w-full select-none"
    >
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
