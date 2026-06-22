import React, { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { Pin, X } from 'lucide-react';

export const PinnedMessageBar: React.FC = () => {
  const { activeConversationId, messages } = useChatStore();
  const [dismissed, setDismissed] = useState(false);

  const conversationMessages = messages[activeConversationId || ''] || [];
  const pinnedMessages = conversationMessages.filter((m) => m.is_pinned);

  if (pinnedMessages.length === 0 || dismissed) return null;

  const latestPinned = pinnedMessages[pinnedMessages.length - 1];

  const handleScrollToMessage = () => {
    const element = document.getElementById(`msg-${latestPinned.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add visual accent highlight flash
      element.classList.add('bg-accent-light', 'dark:bg-accent-light/10');
      setTimeout(() => {
        element.classList.remove('bg-accent-light', 'dark:bg-accent-light/10');
      }, 1000);
    }
  };

  return (
    <div className="bg-bg-sidebar border-b border-divider px-4 py-1.5 flex items-center justify-between z-10 shrink-0 select-none">
      <div
        onClick={handleScrollToMessage}
        className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
      >
        <Pin size={12} className="text-accent shrink-0" />
        <div className="overflow-hidden">
          <p className="text-[10px] font-bold text-text-accent">Pinned Message</p>
          <p className="text-[11px] text-text-secondary truncate">
            {latestPinned.content || `${latestPinned.type} media`}
          </p>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none ml-2"
      >
        <X size={12} />
      </button>
    </div>
  );
};
export default PinnedMessageBar;
