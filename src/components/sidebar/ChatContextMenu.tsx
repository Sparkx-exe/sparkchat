'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Pin, BellOff, Bell, Archive, Trash2, CheckCircle } from 'lucide-react';
import { Conversation } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface ChatContextMenuProps {
  conversation: Conversation;
  position: { x: number; y: number };
  onClose: () => void;
}

export const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
  conversation,
  position,
  onClose,
}) => {
  const { user } = useAuthStore();
  const { updateConversation } = useChatStore();
  const menuRef = useRef<HTMLDivElement>(null);

  const myMember = conversation.members?.find((m) => m.user_id === user?.id);
  const isPinned = myMember?.is_pinned || false;
  const isMuted = myMember?.is_muted || false;

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

  const menuWidth = 190;
  const menuHeight = 250;
  const adjustedX = position.x + menuWidth > window.innerWidth ? position.x - menuWidth : position.x;
  const adjustedY = position.y + menuHeight > window.innerHeight ? position.y - menuHeight : position.y;

  const handlePin = async () => {
    try {
      if (!user || !myMember) return;
      await supabase
        .from('conversation_members')
        .update({ is_pinned: !isPinned })
        .eq('conversation_id', conversation.id)
        .eq('user_id', user.id);

      updateConversation(conversation.id, {
        members: conversation.members?.map((m) =>
          m.user_id === user.id ? { ...m, is_pinned: !isPinned } : m
        ),
      });
      toast.success(isPinned ? 'Chat unpinned' : 'Chat pinned');
    } catch {
      toast.error('Failed to update pin status');
    }
    onClose();
  };

  const handleMute = async () => {
    try {
      if (!user || !myMember) return;
      await supabase
        .from('conversation_members')
        .update({ is_muted: !isMuted })
        .eq('conversation_id', conversation.id)
        .eq('user_id', user.id);

      updateConversation(conversation.id, {
        members: conversation.members?.map((m) =>
          m.user_id === user.id ? { ...m, is_muted: !isMuted } : m
        ),
      });
      toast.success(isMuted ? 'Notifications enabled' : 'Notifications muted');
    } catch {
      toast.error('Failed to update mute status');
    }
    onClose();
  };

  const handleArchive = async () => {
    try {
      if (!user) return;
      await supabase
        .from('conversation_members')
        .update({ is_archived: true })
        .eq('conversation_id', conversation.id)
        .eq('user_id', user.id);
      toast.success('Chat archived');
    } catch {
      toast.error('Failed to archive chat');
    }
    onClose();
  };

  const handleMarkRead = () => {
    toast.success('Marked as read');
    onClose();
  };

  const handleDelete = async () => {
    try {
      if (!user) return;
      await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', conversation.id)
        .eq('user_id', user.id);
      toast.success('You left the conversation');
    } catch {
      toast.error('Failed to delete conversation');
    }
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
      style={{ left: adjustedX, top: adjustedY, width: menuWidth }}
    >
      {menuItem(
        isPinned ? <Pin size={13} className="rotate-45" /> : <Pin size={13} />,
        isPinned ? 'Unpin Chat' : 'Pin Chat',
        handlePin
      )}
      {menuItem(
        isMuted ? <Bell size={13} /> : <BellOff size={13} />,
        isMuted ? 'Unmute' : 'Mute',
        handleMute
      )}
      {menuItem(<CheckCircle size={13} />, 'Mark as Read', handleMarkRead)}
      {menuItem(<Archive size={13} />, 'Archive', handleArchive)}
      <div className="border-t border-divider my-1" />
      {menuItem(<Trash2 size={13} />, 'Delete Chat', handleDelete, true)}
    </motion.div>
  );
};

export default ChatContextMenu;
