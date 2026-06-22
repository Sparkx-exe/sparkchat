import React from 'react';
import { Conversation } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Pin, BellOff, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface ChatListItemProps {
  conversation: Conversation;
  isActive: boolean;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ conversation, isActive }) => {
  const { user } = useAuthStore();
  const { isMobileView, setIsSidebarVisible } = useUIStore();
  const router = useRouter();

  if (!user) return null;

  const myMember = conversation.members?.find((m) => m.user_id === user.id);
  const otherMember = conversation.members?.find((m) => m.user_id !== user.id);
  
  const isPinned = myMember?.is_pinned || false;
  const isMuted = myMember?.is_muted || false;
  const draftText = myMember?.draft || '';

  const handleClick = () => {
    router.push(`/chat/${conversation.id}`);
    if (isMobileView) {
      setIsSidebarVisible(false);
    }
  };

  // Preview formatted text message
  const renderMessagePreview = () => {
    if (draftText) {
      return (
        <p className="text-2xs sm:text-xs text-danger font-medium truncate">
          Draft: <span className="text-text-secondary font-normal">{draftText}</span>
        </p>
      );
    }

    const msg = conversation.last_message;
    if (!msg) {
      return <p className="text-2xs sm:text-xs text-text-placeholder truncate">No messages yet</p>;
    }

    let prefix = '';
    if (conversation.type === 'group' && msg.sender) {
      prefix = `${msg.sender.display_name}: `;
    }

    let contentText = msg.content || '';
    if (msg.type === 'image') contentText = '📷 Photo';
    else if (msg.type === 'video') contentText = '📹 Video';
    else if (msg.type === 'audio' || msg.type === 'voice_note') contentText = '🎙️ Voice message';
    else if (msg.type === 'file') contentText = `📎 ${msg.media_name || 'File'}`;
    else if (msg.type === 'sticker') contentText = '🎨 Sticker';
    else if (msg.type === 'poll') contentText = '📊 Poll';
    
    return (
      <p className="text-2xs sm:text-xs text-text-secondary truncate">
        <span className="font-medium text-text-primary/70">{prefix}</span>
        {contentText}
      </p>
    );
  };

  // Time formatter
  const formatTime = () => {
    const date = conversation.last_message
      ? new Date(conversation.last_message.created_at)
      : new Date(conversation.updated_at);
    
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'HH:mm');
    }
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return format(date, 'eee');
    }
    return format(date, 'd MMM');
  };

  // Tick marks showing message reads
  const renderTicks = () => {
    const msg = conversation.last_message;
    if (!msg || msg.sender_id !== user.id) return null;
    
    // Hardcode read states for preview
    const isRead = true; 
    
    if (isRead) {
      return <CheckCheck size={12} className="text-check-read inline-block ml-0.5 shrink-0" />;
    }
    return <Check size={12} className="text-check-single inline-block ml-0.5 shrink-0" />;
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none transition-colors border-l-[3px] ${
        isActive
          ? 'bg-bg-active border-accent'
          : 'bg-bg-sidebar border-transparent hover:bg-bg-hover'
      }`}
    >
      <Avatar
        name={conversation.name || 'Chat'}
        src={conversation.avatar_url}
        size="sm"
        isOnline={conversation.type === 'direct' && otherMember?.profile?.is_online}
      />

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-baseline mb-0.5">
          <h4 className="text-xs sm:text-sm font-semibold text-text-primary truncate">
            {conversation.name || 'Group Chat'}
          </h4>
          <span className="text-[10px] text-text-placeholder whitespace-nowrap">
            {formatTime()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex-1 min-w-0">
            {renderMessagePreview()}
          </div>

          <div className="flex items-center gap-1 ml-2">
            {renderTicks()}
            {isMuted && <BellOff size={11} className="text-text-placeholder shrink-0" />}
            {isPinned && <Pin size={11} className="text-accent shrink-0 rotate-45" />}
            
            {conversation.unread_count && conversation.unread_count > 0 ? (
              <span className={`text-[9px] font-bold text-white rounded-full flex items-center justify-center min-w-[16px] h-[16px] px-1 ${
                isMuted ? 'bg-bg-active text-text-secondary' : 'bg-accent'
              }`}>
                {conversation.unread_count}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ChatListItem;
