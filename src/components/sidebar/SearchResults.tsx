import React, { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import { Profile, Conversation } from '@/types';
import { supabase } from '@/lib/supabase/client';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export const SearchResults: React.FC = () => {
  const { searchQuery, setIsSidebarVisible, isMobileView, setSearchQuery } = useUIStore();
  const { conversations } = useChatStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [globalResults, setGlobalResults] = useState<Profile[]>([]);
  const router = useRouter();

  // Search local chat items
  const localResults = conversations.filter((c) =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Search global profiles
  useEffect(() => {
    if (searchQuery.length < 2) {
      setGlobalResults([]);
      return;
    }
    const searchGlobalProfiles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
          .neq('id', user?.id || '')
          .limit(10);
        
        if (error) throw error;
        setGlobalResults(data || []);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchGlobalProfiles, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleGlobalResultClick = async (profile: Profile) => {
    if (!user) return;
    try {
      const { data: convId, error } = await supabase.rpc(
        'get_or_create_direct_conversation',
        { user_a: user.id, user_b: profile.id }
      );
      if (error) throw error;

      setSearchQuery('');
      router.push(`/chat/${convId}`);
      if (isMobileView) {
        setIsSidebarVisible(false);
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  const handleLocalResultClick = (conv: Conversation) => {
    setSearchQuery('');
    router.push(`/chat/${conv.id}`);
    if (isMobileView) {
      setIsSidebarVisible(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-sidebar select-none">
      {/* Local search results */}
      {localResults.length > 0 && (
        <div className="py-2 border-b border-divider">
          <h5 className="px-4 py-1.5 text-[10px] font-semibold text-text-accent uppercase tracking-wider">
            Chats and Contacts
          </h5>
          {localResults.map((c) => (
            <div
              key={c.id}
              onClick={() => handleLocalResultClick(c)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-bg-hover cursor-pointer"
            >
              <Avatar name={c.name || 'Chat'} src={c.avatar_url} size="xs" />
              <div>
                <p className="text-xs font-semibold text-text-primary">{c.name}</p>
                <p className="text-[10px] text-text-secondary">
                  {c.type === 'group' ? 'Group chat' : 'Direct message'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Global search results */}
      <div className="py-2">
        <h5 className="px-4 py-1.5 text-[10px] font-semibold text-text-accent uppercase tracking-wider flex items-center justify-between">
          <span>Global Search</span>
          {loading && <Spinner size="sm" />}
        </h5>

        {globalResults.length > 0 ? (
          globalResults.map((p) => (
            <div
              key={p.id}
              onClick={() => handleGlobalResultClick(p)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-bg-hover cursor-pointer"
            >
              <Avatar name={p.display_name} src={p.avatar_url} size="xs" />
              <div>
                <p className="text-xs font-semibold text-text-primary">{p.display_name}</p>
                <p className="text-[10px] text-text-secondary">@{p.username}</p>
              </div>
            </div>
          ))
        ) : (
          !loading && searchQuery.length >= 2 && (
            <p className="px-4 py-2 text-[10px] text-text-placeholder text-center">
              No global users found
            </p>
          )
        )}
      </div>
    </div>
  );
};
export default SearchResults;
