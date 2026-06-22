'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function EmptyPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full p-6 text-center select-none chat-wallpaper">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="px-5 py-3 rounded-full bg-bg-bubble-in/60 border border-border-subtle backdrop-blur-md shadow-sm max-w-sm"
      >
        <p className="text-text-secondary text-xs sm:text-sm font-medium">
          Select a chat to start messaging
        </p>
      </motion.div>
    </div>
  );
}
