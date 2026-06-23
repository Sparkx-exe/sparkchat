import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Profile } from '@/types';
import { Search, UserPlus } from 'lucide-react';

export const NewChatModal: React.FC = () => {
  const { activeModals, setModal, isMobileView, setIsSidebarVisible } = useUIStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Profile[]>([]);

  const isOpen = activeModals['newChat'] || false;

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setModal('newChat', false);
  };

  useEffect(() => {
    if (!isOpen || query.trim().length < 2 || !user) {
      setResults([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
          .neq('id', user.id)
          .limit(10);

        if (error) throw error;
        setResults(data || []);
      } catch (err) {
        console.error('New chat user search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [query, isOpen, user]);

  const handleSelectUser = async (profile: Profile) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: convId, error } = await supabase.rpc(
        'get_or_create_direct_conversation',
        { user_a: user.id, user_b: profile.id }
      );
      if (error) throw error;

      // Fetch conversation data
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
        .eq('id', convId)
        .single();

      if (convData) {
        // Set display name for direct conversation
        convData.name = profile.display_name;
        convData.avatar_url = profile.avatar_url;
        convData.avatar_blurhash = profile.avatar_blurhash;

        const { conversations, setConversations, setActiveConversationId } = useChatStore.getState();
        if (!conversations.find((c) => c.id === convId)) {
          setConversations([convData as any, ...conversations]);
        }
        setActiveConversationId(convId);
      }

      handleClose();
      router.push(`/chat/${convId}`);
      if (isMobileView) setIsSidebarVisible(false);
    } catch (err: any) {
      console.error('Error starting conversation:', err);
      toast.error('Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Message">
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative flex items-center">
          <span className="absolute left-3 text-text-placeholder">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 bg-bg-input border border-border text-text-primary placeholder-text-placeholder text-xs rounded-md focus:outline-none focus:border-accent"
            placeholder="Search by username or display name..."
            disabled={loading && results.length === 0}
          />
          {loading && (
            <span className="absolute right-3">
              <Spinner size="sm" />
            </span>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1 select-none">
          {results.length > 0 ? (
            results.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSelectUser(p)}
                className="flex items-center gap-3 px-3.5 py-2 mx-0.5 my-1 cursor-pointer select-none transition-all rounded-xl border border-[var(--border-subtle)] bg-bg-input hover:bg-bg-hover hover:border-[var(--border)] shadow-xs"
              >
                <Avatar name={p.display_name} src={p.avatar_url} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-text-primary truncate">{p.display_name}</p>
                  <p className="text-[10px] text-text-secondary truncate">@{p.username}</p>
                </div>
                <UserPlus size={14} className="text-accent shrink-0 ml-2" />
              </div>
            ))
          ) : (
            query.trim().length >= 2 && !loading && (
              <p className="text-xs text-text-placeholder text-center py-6">
                No users found
              </p>
            )
          )}
          {query.trim().length < 2 && (
            <p className="text-xs text-text-placeholder text-center py-6">
              Type at least 2 characters to search users...
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
export default NewChatModal;
