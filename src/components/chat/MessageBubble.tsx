import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Message } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { supabase } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Play, Pause, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, VideoOff } from 'lucide-react';
import { format } from 'date-fns';
import { getAvatarColor } from '@/lib/utils/avatarColor';
import MessageContextMenu from './MessageContextMenu';
import toast from 'react-hot-toast';

interface MessageBubbleProps {
  message: Message;
  hideSenderHeader?: boolean;
  id?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  hideSenderHeader = false,
  id,
}) => {
  const { user } = useAuthStore();
  const { 
    activeConversationId, 
    updateMessage, 
    deleteMessage,
    activeGroupCallParticipants = {},
    callState,
    setCallState
  } = useChatStore();
  const isOutgoing = message.sender_id === user?.id;
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatMessageTime = () => {
    try {
      return format(new Date(message.created_at), 'HH:mm');
    } catch {
      return '';
    }
  };

  const renderTicks = () => {
    if (!isOutgoing) return null;
    const isRead = true; // Hardcoded preview
    if (isRead) {
      return <CheckCheck size={12} className="text-check-read inline-block ml-0.5 shrink-0" />;
    }
    return <Check size={12} className="text-check-single inline-block ml-0.5 shrink-0" />;
  };

  const getSenderNameColor = () => {
    return getAvatarColor(message.sender?.display_name || '');
  };

  const handleDeleteForMe = () => {
    if (!activeConversationId) return;
    deleteMessage(activeConversationId, message.id);
    toast.success('Message deleted for you');
    setShowDeleteModal(false);
  };

  const handleDeleteForEveryone = async () => {
    try {
      if (!activeConversationId) return;
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true, content: 'This message was deleted', media_url: null, type: 'text' })
        .eq('id', message.id);

      if (error) throw error;
      updateMessage(activeConversationId, message.id, {
        is_deleted: true,
        content: 'This message was deleted',
        media_url: null,
        type: 'text',
      });
      toast.success('Message deleted for everyone');
    } catch {
      toast.error('Failed to delete message');
    }
    setShowDeleteModal(false);
  };

  // Right-click context menu handler
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Long-press for mobile
  const handlePointerDown = () => {
    longPressTimerRef.current = setTimeout(() => {
      // Get center of element as menu position
      setContextMenu({ x: window.innerWidth / 2 - 90, y: window.innerHeight / 2 - 100 });
    }, 600);
  };
  const handlePointerUp = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const toggleAudio = () => {
    if (!message.media_url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(message.media_url);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // Deleted message placeholder
  if (message.is_deleted) {
    return (
      <motion.div
        id={id}
        initial={{ opacity: 0, scale: 0.95, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className={`flex items-end gap-2 max-w-[75%] ${
          isOutgoing ? 'justify-end ml-auto' : 'justify-start mr-auto'
        } py-0.5`}
      >
        {!isOutgoing && <div className="w-7 shrink-0" />}
        <div className="px-3 py-1.5 rounded-xl bg-bg-hover border border-border-subtle text-text-secondary text-xs italic flex items-center gap-1.5">
          <span>🚫</span>
          <span>This message was deleted</span>
        </div>
      </motion.div>
    );
  }

  if (message.type === 'call') {
    const isVideo = message.content === 'video';
    const isCompleted = message.media_name === 'completed';
    const isGroupStarted = message.media_name === 'group_started';
    const duration = message.media_duration || 0;

    let title = '';
    let subtitle = '';
    let IconComponent = Phone;
    let iconColor = 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15';

    const formatMessageTime = () => {
      try {
        return format(new Date(message.created_at), 'HH:mm');
      } catch {
        return '';
      }
    };

    const timeStr = formatMessageTime();

    if (isGroupStarted) {
      title = isVideo ? 'Group video call started' : 'Group voice call started';
      const participants = activeGroupCallParticipants[message.conversation_id] || [];
      const isActive = participants.length > 0;
      subtitle = isActive
        ? `Active call (${participants.length} joined) • ${timeStr}`
        : `Call ended • ${timeStr}`;
      IconComponent = isVideo ? Video : Phone;
      iconColor = isVideo
        ? 'text-sky-500 bg-sky-500/10 dark:bg-sky-500/15'
        : 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15';
    } else if (isVideo) {
      title = isOutgoing ? 'Video call' : (isCompleted ? 'Video call' : 'Missed video call');
      if (isCompleted) {
        const mins = Math.floor(duration / 60).toString().padStart(2, '0');
        const secs = (duration % 60).toString().padStart(2, '0');
        subtitle = `Duration: ${mins}:${secs} • ${timeStr}`;
        IconComponent = Video;
        iconColor = 'text-sky-500 bg-sky-500/10 dark:bg-sky-500/15';
      } else {
        if (isOutgoing) {
          subtitle = `No answer • ${timeStr}`;
          IconComponent = Video;
          iconColor = 'text-text-secondary bg-bg-hover';
        } else {
          subtitle = `Missed • ${timeStr}`;
          IconComponent = VideoOff;
          iconColor = 'text-red-500 bg-red-500/10 dark:bg-red-500/15';
        }
      }
    } else {
      title = isOutgoing ? 'Voice call' : (isCompleted ? 'Voice call' : 'Missed voice call');
      if (isCompleted) {
        const mins = Math.floor(duration / 60).toString().padStart(2, '0');
        const secs = (duration % 60).toString().padStart(2, '0');
        subtitle = `Duration: ${mins}:${secs} • ${timeStr}`;
        IconComponent = isOutgoing ? PhoneOutgoing : PhoneIncoming;
        iconColor = 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15';
      } else {
        if (isOutgoing) {
          subtitle = `No answer • ${timeStr}`;
          IconComponent = PhoneOutgoing;
          iconColor = 'text-text-secondary bg-bg-hover';
        } else {
          subtitle = `Missed • ${timeStr}`;
          IconComponent = PhoneMissed;
          iconColor = 'text-red-500 bg-red-500/10 dark:bg-red-500/15';
        }
      }
    }

    const participantsList = activeGroupCallParticipants[message.conversation_id] || [];
    const isGroupCallActive = isGroupStarted && participantsList.length > 0;
    const canJoin = isGroupCallActive && !callState;

    const handleJoinGroupCall = () => {
      setCallState({
        type: isVideo ? 'video' : 'voice',
        conversationId: message.conversation_id,
        status: 'active',
        isOutgoing: false,
        callPartnerId: '',
        isGroupCall: true,
      });
    };

    return (
      <div className="w-full flex justify-center my-3.5 px-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="flex items-center gap-3.5 bg-bg-elevated border border-border rounded-2xl px-4 py-2.5 max-w-[320px] w-full shadow-xs hover:shadow-sm transition-all duration-200"
        >
          {/* Icon Circle */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
            <IconComponent size={18} />
          </div>

          {/* Text Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs sm:text-sm font-semibold text-text-primary truncate">
              {title}
            </h4>
            <p className="text-[10px] sm:text-xs text-text-secondary truncate mt-0.5 font-medium">
              {subtitle}
            </p>
          </div>

          {/* Action Button for Group Call Join */}
          {canJoin && (
            <button
              onClick={handleJoinGroupCall}
              className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[10px] sm:text-xs font-semibold shadow-xs transition-all shrink-0 flex items-center justify-center gap-1 focus:outline-none"
            >
              Join
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <div className="rounded-md overflow-hidden max-w-[240px] border border-border-subtle bg-bg-hover mt-1">
            <img
              src={message.media_url || ''}
              alt="Photo"
              className="w-full h-full object-cover max-h-[220px] cursor-pointer"
              onClick={() => window.open(message.media_url || '', '_blank')}
            />
          </div>
        );
      case 'video':
        return (
          <div className="rounded-md overflow-hidden max-w-[240px] border border-border-subtle bg-bg-hover mt-1">
            <video
              src={message.media_url || ''}
              className="w-full h-full object-cover max-h-[180px]"
              controls
            />
          </div>
        );
      case 'file':
        return (
          <a
            href={message.media_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2.5 py-1.5 bg-bg-hover rounded-md border border-border-subtle mt-1 max-w-[240px] hover:bg-bg-active transition-colors"
          >
            <div className="w-8 h-8 bg-accent/10 rounded flex items-center justify-center text-accent text-[10px] font-bold shrink-0">
              {(message.media_name?.split('.').pop()?.toUpperCase() || 'FILE').slice(0, 4)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold truncate text-text-primary">
                {message.media_name || 'Document'}
              </p>
              <p className="text-[9px] text-text-secondary">
                {message.media_size
                  ? `${(message.media_size / 1024).toFixed(1)} KB`
                  : 'File'}
              </p>
            </div>
          </a>
        );
      case 'voice_note':
      case 'audio':
        return (
          <div className="flex items-center gap-2 px-2 py-1.5 mt-1 min-w-[200px]">
            <button
              onClick={toggleAudio}
              className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shrink-0 hover:bg-accent-hover transition-colors"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-end gap-0.5 h-5 mb-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-current rounded-full opacity-50"
                    style={{
                      height: `${20 + Math.sin(i * 0.8) * 60}%`,
                      minWidth: 2,
                    }}
                  />
                ))}
              </div>
              <p className="text-[9px] text-text-secondary">
                {message.media_duration ? `${message.media_duration}s` : 'Voice note'}
              </p>
            </div>
          </div>
        );
      case 'poll':
        return (
          <div className="min-w-[200px] space-y-1.5 py-1 mt-1">
            <p className="text-xs font-semibold text-text-primary">
              📊 {message.content || 'Poll Question'}
            </p>
            <div className="space-y-1">
              {['Option A', 'Option B'].map((option) => (
                <div
                  key={option}
                  className="px-2.5 py-1 bg-bg-hover rounded-md text-[11px] font-medium cursor-pointer border border-transparent hover:border-border transition-colors text-text-primary"
                >
                  {option}
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <p className="text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        );
    }
  };

  const bubbleClasses = isOutgoing
    ? 'bg-bg-bubble-out text-text-bubble-out rounded-bubble-out ml-auto'
    : 'bg-bg-bubble-in text-text-bubble-in rounded-bubble-in mr-auto shadow-xs';

  return (
    <>
      <motion.div
        id={id}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerUp}
        onPointerLeave={handlePointerUp}
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 320 }}
        className={`flex items-end gap-2 max-w-[75%] ${
          isOutgoing ? 'justify-end ml-auto' : 'justify-start mr-auto'
        } select-none py-0.5 group`}
      >
        {/* Sender Avatar in Group */}
        {!isOutgoing && (
          !hideSenderHeader && message.sender ? (
            <Avatar
              name={message.sender.display_name}
              src={message.sender.avatar_url}
              size="xs"
            />
          ) : (
            <div className="w-7 shrink-0" />
          )
        )}

        {/* Bubble Details */}
        <div className={`px-2.5 py-1.5 flex flex-col relative max-w-full ${bubbleClasses}`}>
          {/* Reply Quote Header */}
          {message.reply_to && (
            <div className="mb-1 px-1.5 py-0.5 border-l border-accent bg-bg-hover/40 rounded-xs text-[10px] truncate max-w-full">
              <span className="font-bold text-text-accent block">Replied message</span>
              <span className="text-text-secondary text-[9px]">View original...</span>
            </div>
          )}

          {/* Sender Name in group */}
          {!isOutgoing && !hideSenderHeader && message.sender && (
            <span
              className="text-[11px] font-bold block mb-0.5"
              style={{ color: getSenderNameColor() }}
            >
              {message.sender.display_name}
            </span>
          )}

          {/* Edited badge */}
          {message.edited_at && (
            <span className="text-[8px] text-text-secondary italic mb-0.5">edited</span>
          )}

          {/* Message Content */}
          {renderContent()}

          {/* Footer Timestamp / Read ticks */}
          <div className="flex items-center justify-end gap-1 self-end mt-1 select-none pointer-events-none">
            <span className="text-[9px] text-text-timestamp leading-none">
              {formatMessageTime()}
            </span>
            {renderTicks()}
          </div>
        </div>
      </motion.div>

      {/* Context menu */}
      {mounted && contextMenu && createPortal(
        <MessageContextMenu
          message={message}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onDeleteClick={() => {
            setContextMenu(null);
            setShowDeleteModal(true);
          }}
        />,
        document.body
      )}

      {/* WhatsApp-Style Delete Confirmation Modal */}
      {mounted && showDeleteModal && createPortal(
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-bg-elevated border border-border rounded-xl p-5 max-w-[280px] w-full shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-text-primary text-center">
            <p className="text-xs sm:text-sm font-medium mb-5 text-text-secondary">
              Delete message?
            </p>
            <div className="flex flex-col gap-2">
              {isOutgoing && (
                <button
                  onClick={handleDeleteForEveryone}
                  className="w-full py-2 px-4 rounded-lg bg-danger/10 hover:bg-danger text-danger hover:text-white text-xs font-bold transition-all border border-danger/20"
                >
                  Delete for Everyone
                </button>
              )}
              <button
                onClick={handleDeleteForMe}
                className="w-full py-2 px-4 rounded-lg bg-accent/15 hover:bg-accent text-accent hover:text-white text-xs font-bold transition-all border border-accent/20"
              >
                Delete for Me
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-2 px-4 rounded-lg bg-bg-hover hover:bg-bg-active text-text-secondary hover:text-text-primary text-xs font-bold transition-all border border-border"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
export default MessageBubble;
