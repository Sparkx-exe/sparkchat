import React, { useEffect } from 'react';
import ChatHeader from './ChatHeader';
import PinnedMessageBar from './PinnedMessageBar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import MessageSearch from './MessageSearch';
import TypingIndicator from './TypingIndicator';
import { useChatStore } from '@/stores/chatStore';
import { supabase } from '@/lib/supabase/client';
import { Message } from '@/types';
import { motion } from 'framer-motion';

export const ChatWindow: React.FC = () => {
  const { activeConversationId, setMessages, addMessage, updateMessage, deleteMessage } = useChatStore();

  useEffect(() => {
    if (!activeConversationId) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*, sender:profiles!messages_sender_id_fkey(*)')
          .eq('conversation_id', activeConversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(activeConversationId, data || []);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };

    fetchMessages();

    // Subscribe to new messages AND updates in realtime
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          updateMessage(activeConversationId, payload.new.id, payload.new as Partial<Message>);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          if (payload.old?.id) {
            deleteMessage(activeConversationId, payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, setMessages, addMessage, updateMessage, deleteMessage]);

  if (!activeConversationId) {
    return (
      <div className="flex-1 flex items-center justify-center select-none chat-wallpaper text-text-secondary text-sm">
        Select a conversation to start chatting
      </div>
    );
  }

  return (
    <motion.div
      key={activeConversationId}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="flex-1 flex flex-col h-full overflow-hidden chat-wallpaper relative"
    >
      <ChatHeader />
      <MessageSearch />
      <PinnedMessageBar />
      <MessageList />
      <TypingIndicator />
      <MessageInput />
    </motion.div>
  );
};
export default ChatWindow;
