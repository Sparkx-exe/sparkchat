import React, { useEffect } from 'react';
import ChatHeader from './ChatHeader';
import PinnedMessageBar from './PinnedMessageBar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { useChatStore } from '@/stores/chatStore';
import { supabase } from '@/lib/supabase/client';
import { Message } from '@/types';

export const ChatWindow: React.FC = () => {
  const { activeConversationId, setMessages, addMessage } = useChatStore();

  useEffect(() => {
    if (!activeConversationId) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*, sender:profiles(*)')
          .eq('conversation_id', activeConversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(activeConversationId, data || []);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };

    fetchMessages();

    // Subscribe to new messages in realtime
    const channel = supabase
      .channel(`chat_messages:${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        async (payload) => {
          try {
            // Fetch sender profile details to join with the message object
            const { data: sender } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', payload.new.sender_id)
              .single();
            
            const fullMessage: Message = {
              ...(payload.new as Message),
              sender: sender || undefined,
            };
            addMessage(activeConversationId, fullMessage);
          } catch (err) {
            console.error('Realtime message profile join error:', err);
            addMessage(activeConversationId, payload.new as Message);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, setMessages, addMessage]);

  if (!activeConversationId) {
    return (
      <div className="flex-1 flex items-center justify-center select-none chat-wallpaper text-text-secondary text-sm">
        Select a conversation to start chatting
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden chat-wallpaper relative">
      <ChatHeader />
      <PinnedMessageBar />
      <MessageList />
      <TypingIndicator />
      <MessageInput />
    </div>
  );
};
export default ChatWindow;
