'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';

export const MessageSearch: React.FC = () => {
  const {
    activeConversationId,
    messages,
    messageSearchOpen,
    messageSearchQuery,
    setMessageSearchQuery,
    setMessageSearchOpen,
  } = useChatStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const conversationMessages = messages[activeConversationId || ''] || [];

  // Filter messages that match the query
  const matchingMessageIds = conversationMessages
    .filter(
      (m) =>
        m.type === 'text' &&
        m.content &&
        messageSearchQuery.trim().length > 0 &&
        m.content.toLowerCase().includes(messageSearchQuery.toLowerCase())
    )
    .map((m) => m.id);

  const totalMatches = matchingMessageIds.length;

  useEffect(() => {
    if (messageSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [messageSearchOpen]);

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [messageSearchQuery]);

  // Scroll to the current match
  useEffect(() => {
    if (matchingMessageIds.length === 0) return;
    const targetId = matchingMessageIds[currentMatchIndex];
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('search-highlight-flash');
      setTimeout(() => el.classList.remove('search-highlight-flash'), 1200);
    }
  }, [currentMatchIndex, matchingMessageIds]);

  const goToPrev = () => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
  };

  const goToNext = () => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % totalMatches);
  };

  const handleClose = () => {
    setMessageSearchOpen(false);
    setMessageSearchQuery('');
  };

  if (!messageSearchOpen) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-bg-sidebar border-b border-divider shrink-0 animate-slide-in-top">
      {/* Search Icon */}
      <Search size={14} className="text-text-secondary shrink-0" />

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={messageSearchQuery}
        onChange={(e) => setMessageSearchQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.shiftKey ? goToPrev() : goToNext();
          } else if (e.key === 'Escape') {
            handleClose();
          }
        }}
        placeholder="Search messages..."
        className="flex-1 bg-transparent text-text-primary text-xs sm:text-sm placeholder-text-placeholder focus:outline-none"
      />

      {/* Result count */}
      {messageSearchQuery.trim() && (
        <span className="text-[10px] text-text-secondary whitespace-nowrap shrink-0">
          {totalMatches === 0
            ? 'No results'
            : `${currentMatchIndex + 1} of ${totalMatches}`}
        </span>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={goToPrev}
          disabled={totalMatches === 0}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
        >
          <ArrowUp size={14} />
        </button>
        <button
          onClick={goToNext}
          disabled={totalMatches === 0}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
        >
          <ArrowDown size={14} />
        </button>
      </div>

      {/* Close */}
      <button
        onClick={handleClose}
        className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default MessageSearch;
