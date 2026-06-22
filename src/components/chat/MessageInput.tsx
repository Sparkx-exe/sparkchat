import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Send, Mic } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import EmojiPicker from 'emoji-picker-react';
import toast from 'react-hot-toast';

export const MessageInput: React.FC = () => {
  const { activeConversationId, drafts, setDraft } = useChatStore();
  const { user, profile } = useAuthStore();
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Restore draft when activeConversationId changes
  useEffect(() => {
    if (activeConversationId) {
      setText(drafts[activeConversationId] || '');
    }
  }, [activeConversationId, drafts]);

  // Adjust textarea heights automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (activeConversationId) {
      setDraft(activeConversationId, val);
    }
    broadcastTyping();
  };

  // Broadcast typing activity using Supabase Realtime broadcast channels
  const broadcastTyping = () => {
    if (!activeConversationId || !profile) return;
    const channel = supabase.channel(`typing:${activeConversationId}`);
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { username: profile.display_name },
        });
      }
    });
  };

  const handleSend = async () => {
    if (!text.trim() || !activeConversationId || !user) return;
    const messageText = text.trim();
    setText('');
    if (activeConversationId) {
      setDraft(activeConversationId, '');
    }

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: activeConversationId,
        sender_id: user.id,
        content: messageText,
        type: 'text',
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Close emoji picker on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="px-4 py-2.5 bg-bg-sidebar border-t border-divider flex flex-col z-10 shrink-0 select-none relative">
      <div className="flex items-end gap-2 w-full">
        {/* Emoji Selector */}
        <div className="relative flex items-center" ref={emojiRef}>
          <button
            onClick={() => setEmojiOpen(!emojiOpen)}
            className="p-1.5 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none shrink-0"
          >
            <Smile size={18} />
          </button>

          {emojiOpen && (
            <div className="absolute bottom-10 left-0 z-50">
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  setText((prev) => prev + emojiData.emoji);
                  setEmojiOpen(false);
                }}
                lazyLoadEmojis={true}
              />
            </div>
          )}
        </div>

        {/* Text Input area */}
        <div className="flex-1 bg-bg-input border border-border rounded-md px-2.5 py-1 flex items-end">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent resize-none border-none text-text-primary placeholder-text-placeholder focus:outline-none py-0.5 text-xs sm:text-sm max-h-24"
            placeholder="Type a message..."
          />
        </div>

        {/* Attachments */}
        <button
          onClick={() => toast('Attachment uploads coming soon', { icon: '📎' })}
          className="p-1.5 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none shrink-0"
        >
          <Paperclip size={18} />
        </button>

        {/* Send message button */}
        {text.trim() ? (
          <button
            onClick={handleSend}
            className="p-1.5 rounded-full bg-accent hover:bg-accent-hover text-white transition-colors focus:outline-none shrink-0 shadow-xs"
          >
            <Send size={15} />
          </button>
        ) : (
          <button
            onClick={() => toast('Voice notes recording coming soon', { icon: '🎙️' })}
            className="p-1.5 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none shrink-0"
          >
            <Mic size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
export default MessageInput;
