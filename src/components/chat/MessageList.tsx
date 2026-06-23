import React, { useRef, useEffect, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';
import SystemMessage from './SystemMessage';
import { ArrowDown } from 'lucide-react';

export const MessageList: React.FC = () => {
  const { activeConversationId, messages } = useChatStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const conversationMessages = messages[activeConversationId || ''] || [];

  const rowVirtualizer = useVirtualizer({
    count: conversationMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (conversationMessages.length > 0) {
      rowVirtualizer.scrollToIndex(conversationMessages.length - 1);
    }
  }, [conversationMessages.length, rowVirtualizer]);

  // Check scroll position to show/hide "Scroll to Bottom" button
  const handleScroll = () => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    setShowScrollBottom(!isAtBottom);
  };

  const handleScrollToBottom = () => {
    if (conversationMessages.length > 0) {
      rowVirtualizer.scrollToIndex(conversationMessages.length - 1);
    }
  };

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-3 select-none flex flex-col relative"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const message = conversationMessages[virtualRow.index];
          const prevMessage =
            virtualRow.index > 0 ? conversationMessages[virtualRow.index - 1] : null;

          // Date Separator calculation
          const showDateSeparator =
            !prevMessage ||
            new Date(message.created_at).toDateString() !==
              new Date(prevMessage.created_at).toDateString();

          // Sender group header details
          const isSameSender = prevMessage && prevMessage.sender_id === message.sender_id;
          const isCloseInTime =
            prevMessage &&
            new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() <
              300000; // 5 min interval
          
          const hideSenderHeader = isSameSender && isCloseInTime;

          return (
            <div
              key={message.id}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="py-0.5"
            >
              {showDateSeparator && <DateSeparator date={new Date(message.created_at)} />}

              {message.type === 'system' ? (
                <SystemMessage content={message.content || ''} />
              ) : (
                <MessageBubble
                  id={`msg-${message.id}`}
                  message={message}
                  hideSenderHeader={hideSenderHeader || false}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Action Scroll-to-Bottom button */}
      {showScrollBottom && (
        <button
          onClick={handleScrollToBottom}
          className="absolute bottom-16 right-6 w-9 h-9 rounded-full bg-bg-sidebar border border-border shadow-md text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors focus:outline-none z-30"
        >
          <ArrowDown size={16} />
        </button>
      )}
    </div>
  );
};
export default MessageList;
