import React from 'react';
import { Message } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import Avatar from '@/components/ui/Avatar';
import { Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { getAvatarColor } from '@/lib/utils/avatarColor';

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
  const isOutgoing = message.sender_id === user?.id;

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

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <div className="rounded-md overflow-hidden max-w-[240px] border border-border-subtle bg-bg-hover mt-1">
            <img
              src={message.media_url || ''}
              alt="Photo preview"
              className="w-full h-full object-cover max-h-[180px]"
            />
          </div>
        );
      case 'video':
        return (
          <div className="rounded-md overflow-hidden max-w-[240px] border border-border-subtle bg-bg-hover mt-1 relative">
            <video
              src={message.media_url || ''}
              className="w-full h-full object-cover max-h-[180px]"
              controls
            />
          </div>
        );
      case 'file':
        return (
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-bg-hover rounded-md border border-border-subtle mt-1 max-w-[240px]">
            <div className="w-8 h-8 bg-accent/10 rounded flex items-center justify-center text-accent text-[10px] font-bold shrink-0">
              DOC
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold truncate text-text-primary">
                {message.media_name || 'Document'}
              </p>
              <p className="text-[9px] text-text-secondary">
                {message.media_size
                  ? `${(message.media_size / 1024 / 1024).toFixed(2)} MB`
                  : 'Unknown size'}
              </p>
            </div>
          </div>
        );
      case 'voice_note':
      case 'audio':
        return (
          <div className="flex items-center gap-2 px-2 py-1 mt-1 min-w-[180px]">
            <button className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold shrink-0">
              ▶
            </button>
            <div className="flex-1 min-w-0">
              <div className="h-1 bg-border rounded-full relative">
                <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-accent rounded-full" />
              </div>
              <p className="text-[8px] text-text-secondary mt-0.5">
                0:02 / {message.media_duration ? `0:${message.media_duration}` : '0:10'}
              </p>
            </div>
          </div>
        );
      case 'poll':
        return (
          <div className="min-w-[200px] space-y-1.5 py-1 mt-1 select-none">
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
    <div
      id={id}
      className={`flex items-end gap-2 max-w-[75%] ${
        isOutgoing ? 'justify-end ml-auto' : 'justify-start mr-auto'
      } select-none py-0.5`}
    >
      {/* Sender Avatar in Group */}
      {!isOutgoing && !hideSenderHeader && message.sender && (
        <Avatar
          name={message.sender.display_name}
          src={message.sender.avatar_url}
          size="xs"
        />
      )}
      {!isOutgoing && hideSenderHeader && <div className="w-6 shrink-0" />}

      {/* Bubble Details */}
      <div className={`px-2.5 py-1.5 flex flex-col relative max-w-full ${bubbleClasses}`}>
        {/* Reply Quote Header */}
        {message.reply_to && (
          <div className="mb-1 px-1.5 py-0.5 border-l border-accent bg-bg-hover/40 rounded-xs text-[10px] truncate max-w-full">
            <span className="font-bold text-text-accent block">Reply Quote</span>
            <span className="text-text-secondary text-[9px]">Reference message content...</span>
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
    </div>
  );
};
export default MessageBubble;
