import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Conversation } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Pin, BellOff, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import ChatContextMenu from './ChatContextMenu';

interface ChatListItemProps {
  conversation: Conversation;
  isActive: boolean;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ conversation, isActive }) => {
  const { user } = useAuthStore();
  const { isMobileView, setIsSidebarVisible } = useUIStore();
  const router = useRouter();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!user) return null;

  const myMember = conversation.members?.find((m) => m.user_id === user.id);
  const otherMember = conversation.members?.find((m) => m.user_id !== user.id);

  const isPinned = myMember?.is_pinned || false;
  const isMuted = myMember?.is_muted || false;
  const draftText = myMember?.draft || '';

  const handleClick = () => {
    if (contextMenu) return; // Don't navigate if context menu is open
    router.push(`/chat/${conversation.id}`);
    if (isMobileView) {
      setIsSidebarVisible(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Long-press for mobile
  const handlePointerDown = () => {
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({ x: window.innerWidth / 2 - 95, y: window.innerHeight / 2 - 100 });
    }, 600);
  };
  const handlePointerUp = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
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

    if (msg.is_deleted) {
      return <p className="text-2xs sm:text-xs text-text-placeholder truncate italic">🚫 Message deleted</p>;
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
    else if (msg.type === 'call') {
      const isVideo = msg.content === 'video';
      const isMissed = msg.media_name === 'missed';
      const isNoAnswer = msg.media_name === 'no_answer';
      let outcome = 'Completed';
      if (isMissed) outcome = 'Missed';
      else if (isNoAnswer) outcome = 'Unanswered';
      contentText = `${isVideo ? '📹' : '📞'} ${outcome} ${isVideo ? 'video' : 'voice'} call`;
    }

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

  // Tick marks
  const renderTicks = () => {
    const msg = conversation.last_message;
    if (!msg || msg.sender_id !== user.id) return null;
    const isRead = true;
    if (isRead) {
      return <CheckCheck size={12} className="text-check-read inline-block ml-0.5 shrink-0" />;
    }
    return <Check size={12} className="text-check-single inline-block ml-0.5 shrink-0" />;
  };

  return (
    <>
      <motion.div
        layout
        whileHover={{ scale: 1.015, y: -0.5 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`relative flex items-center gap-3 px-3.5 py-2.5 mx-3 my-1.5 cursor-pointer select-none rounded-xl border shadow-xs transition-colors duration-200 ${
          isActive
            ? 'bg-bg-active/60 border-border/40 text-text-primary'
            : 'bg-transparent border-transparent hover:bg-bg-hover/60 hover:border-border/30 text-text-secondary'
        }`}
      >
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-1.5 top-3.5 bottom-3.5 w-1 bg-accent rounded-full z-10"
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          />
        )}
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
                <span
                  className={`text-[9px] font-bold text-white rounded-full flex items-center justify-center min-w-[16px] h-[16px] px-1 ${
                    isMuted ? 'bg-bg-active text-text-secondary' : 'bg-accent'
                  }`}
                >
                  {conversation.unread_count}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Context menu */}
      {mounted && contextMenu && createPortal(
        <ChatContextMenu
          conversation={conversation}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />,
        document.body
      )}
    </>
  );
};
export default ChatListItem;
