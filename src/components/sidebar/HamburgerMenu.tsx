import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import Avatar from '@/components/ui/Avatar';
import { User, Bookmark, Users, Settings, ChevronRight, LogOut } from 'lucide-react';
import MoreSubMenu from './MoreSubMenu';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/stores/chatStore';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface HamburgerMenuProps {
  onClose: () => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ onClose }) => {
  const { profile } = useAuthStore();
  const { setModal } = useUIStore();
  const { logout } = useAuth();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const router = useRouter();

  if (!profile) return null;

  const handleOpenSavedMessages = async () => {
    onClose();
    try {
      // 1. Search for existing saved messages chat
      const { data: existing, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('type', 'saved')
        .eq('created_by', profile.id)
        .limit(1);

      if (error) throw error;

      let conversationId = '';

      if (existing && existing.length > 0) {
        conversationId = existing[0].id;
      } else {
        // 2. Create new saved messages chat
        const convId = crypto.randomUUID();
        const { error: convError } = await supabase
          .from('conversations')
          .insert({
            id: convId,
            type: 'saved',
            name: 'Saved Messages',
            created_by: profile.id,
          });

        if (convError) throw convError;

        const { error: memberError } = await supabase
          .from('conversation_members')
          .insert({
            conversation_id: convId,
            user_id: profile.id,
            role: 'owner',
          });

        if (memberError) throw memberError;

        conversationId = convId;
      }

      // 3. Fetch full conversation data to add to local Zustand store
      const { data: convData } = await supabase
        .from('conversations')
        .select(`
          *,
          members:conversation_members(
            *,
            profile:profiles(*)
          ),
          messages(
            *,
            sender:profiles!messages_sender_id_fkey(*)
          )
        `)
        .eq('id', conversationId)
        .single();

      if (convData) {
        // Set display name for saved chats
        convData.name = 'Saved Messages';
        const { conversations, setConversations, setActiveConversationId } = useChatStore.getState();
        if (!conversations.find((c) => c.id === conversationId)) {
          setConversations([convData as any, ...conversations]);
        }
        setActiveConversationId(conversationId);
      }

      router.push(`/chat/${conversationId}`);
    } catch (err: any) {
      console.error('Error opening Saved Messages:', err);
      toast.error('Failed to open Saved Messages');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.12 }}
      className="absolute top-10 left-0 w-60 bg-bg-elevated border border-border shadow-lg rounded-md z-50 py-1.5 select-none overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {!showMoreMenu ? (
          <motion.div
            key="main-menu"
            initial={{ x: 0 }}
            exit={{ x: -180, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header User info */}
            <div className="px-4 py-2 border-b border-divider flex items-center gap-3">
              <Avatar name={profile.display_name} src={profile.avatar_url} size="xs" />
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-text-primary truncate">
                  {profile.display_name}
                </p>
                <p className="text-[10px] text-text-secondary truncate">
                  @{profile.username}
                </p>
              </div>
            </div>

            {/* Menu Items list */}
            <div className="mt-1">
              <button
                onClick={() => {
                  setModal('editProfile', true);
                  onClose();
                }}
                className="w-full px-4 py-1.5 flex items-center gap-3 hover:bg-bg-hover text-xs text-text-primary transition-colors text-left"
              >
                <User size={14} className="text-text-secondary" />
                <span>My Profile</span>
              </button>

              <button
                onClick={handleOpenSavedMessages}
                className="w-full px-4 py-1.5 flex items-center gap-3 hover:bg-bg-hover text-xs text-text-primary transition-colors text-left"
              >
                <Bookmark size={14} className="text-text-secondary" />
                <span>Saved Messages</span>
              </button>

              <button
                onClick={() => {
                  setModal('contacts', true);
                  onClose();
                }}
                className="w-full px-4 py-1.5 flex items-center gap-3 hover:bg-bg-hover text-xs text-text-primary transition-colors text-left"
              >
                <Users size={14} className="text-text-secondary" />
                <span>Contacts</span>
              </button>

              <button
                onClick={() => {
                  setModal('settings', true);
                  onClose();
                }}
                className="w-full px-4 py-1.5 flex items-center gap-3 hover:bg-bg-hover text-xs text-text-primary transition-colors text-left"
              >
                <Settings size={14} className="text-text-secondary" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => setShowMoreMenu(true)}
                className="w-full px-4 py-1.5 flex items-center justify-between hover:bg-bg-hover text-xs text-text-primary transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <ChevronRight size={14} className="text-text-secondary invisible" />
                  <span className="-ml-3">More</span>
                </div>
                <ChevronRight size={12} className="text-text-secondary" />
              </button>

              <div className="border-t border-divider mt-1 pt-1">
                <button
                  onClick={logout}
                  className="w-full px-4 py-1.5 flex items-center gap-3 hover:bg-bg-hover text-xs text-danger hover:text-danger-hover transition-colors text-left font-medium"
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <MoreSubMenu onBack={() => setShowMoreMenu(false)} onClose={onClose} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
export default HamburgerMenu;
