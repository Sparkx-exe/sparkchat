'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Reply,
  Copy,
  Forward,
  Pin,
  Star,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Message } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface MessageContextMenuProps {
  message: Message;
  position: { x: number; y: number };
  onClose: () => void;
  onDeleteClick: () => void;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  message,
  position,
  onClose,
  onDeleteClick,
}) => {
  const { user } = useAuthStore();
  const { activeConversationId, setReplyToMessage, setEditingMessage } = useChatStore();
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwnMessage = message.sender_id === user?.id;

  // Close on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  // Adjust position so menu doesn't overflow viewport
  const menuWidth = 180;
  const menuHeight = 220; // Reduced height since delete submenu is gone
  const adjustedX = position.x + menuWidth > window.innerWidth ? position.x - menuWidth : position.x;
  const adjustedY = position.y + menuHeight > window.innerHeight ? position.y - menuHeight : position.y;

  const handleReply = () => {
    setReplyToMessage(message.id);
    onClose();
  };

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast.success('Copied to clipboard');
    }
    onClose();
  };

  const handleForward = () => {
    toast('Forward feature coming soon', { icon: '📤' });
    onClose();
  };

  const handlePin = async () => {
    try {
      if (!activeConversationId) return;
      await supabase.from('pinned_messages').insert({
        conversation_id: activeConversationId,
        message_id: message.id,
        pinned_by: user?.id,
      });
      toast.success('Message pinned');
    } catch {
      toast.error('Failed to pin message');
    }
    onClose();
  };

  const handleStar = () => {
    toast('Message starred', { icon: '⭐' });
    onClose();
  };

  const menuItem = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    danger = false
  ) => (
    <button
      key={label}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors hover:bg-bg-hover ${
        danger ? 'text-danger hover:text-danger-hover' : 'text-text-primary'
      }`}
    >
      <span className={`shrink-0 ${danger ? 'text-danger' : 'text-text-secondary'}`}>{icon}</span>
      {label}
    </button>
  );

  return (
    <motion.div
      ref={menuRef}
      initial={{ scale: 0.93, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 450 }}
      className="fixed z-[100] bg-bg-elevated border border-border rounded-lg shadow-2xl overflow-hidden py-1"
      style={{ left: adjustedX, top: adjustedY, width: menuWidth, minWidth: 160 }}
    >
      {menuItem(<Reply size={13} />, 'Reply', handleReply)}
      {menuItem(<Copy size={13} />, 'Copy Text', handleCopy)}
      {menuItem(<Forward size={13} />, 'Forward', handleForward)}
      {menuItem(<Pin size={13} />, 'Pin Message', handlePin)}
      {menuItem(<Star size={13} />, 'Star', handleStar)}

      {isOwnMessage ? (
        <>
          <div className="border-t border-divider my-1" />
          {message.type === 'text' && menuItem(<Pencil size={13} />, 'Edit', () => {
            setEditingMessage(message.id);
            onClose();
          })}
          {menuItem(<Trash2 size={13} />, 'Delete', onDeleteClick, true)}
        </>
      ) : (
        <>
          <div className="border-t border-divider my-1" />
          {menuItem(<Trash2 size={13} />, 'Delete for Me', onDeleteClick, true)}
        </>
      )}
    </motion.div>
  );
};

export default MessageContextMenu;
