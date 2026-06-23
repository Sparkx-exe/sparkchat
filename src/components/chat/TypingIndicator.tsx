import React from 'react';
import { useChatStore } from '@/stores/chatStore';
import { motion, AnimatePresence } from 'framer-motion';

export const TypingIndicator: React.FC = () => {
  const { activeConversationId, typing } = useChatStore();

  const typingUsers = typing[activeConversationId || ''] || [];

  let text = '';
  if (typingUsers.length === 1) {
    text = `${typingUsers[0]} is typing...`;
  } else if (typingUsers.length === 2) {
    text = `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
  } else {
    text = `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;
  }

  return (
    <AnimatePresence>
      {typingUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 15 }}
          transition={{ type: 'spring', damping: 20, stiffness: 350 }}
          className="absolute bottom-14 left-4 z-10 bg-bg-bubble-in/80 border border-border-subtle backdrop-blur-md px-3 py-1 rounded-full shadow-xs flex items-center gap-2 select-none"
        >
          {/* Animated bouncing dots */}
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-[10px] font-semibold text-text-primary">
            {text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
export default TypingIndicator;
