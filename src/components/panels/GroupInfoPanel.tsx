import React, { useState } from 'react';
import { X, Copy, Info, Users, Bell, LogOut, Shield, UserPlus } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import Avatar from '@/components/ui/Avatar';
import Toggle from '@/components/ui/Toggle';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export const GroupInfoPanel: React.FC = () => {
  const { setRightPanel } = useUIStore();
  const { conversations, activeConversationId, setConversations, setActiveConversationId } = useChatStore();
  const { user } = useAuthStore();
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMember, setLoadingMember] = useState<string | null>(null);

  const conversation = conversations.find((c) => c.id === activeConversationId);

  const myMember = conversation?.members?.find((m) => m.user_id === user?.id);
  const isAdminOrOwner = myMember?.role === 'admin' || myMember?.role === 'owner';

  const handleMemberSearch = async (query: string) => {
    setMemberSearchQuery(query);
    if (!query.trim() || !conversation) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const memberIds = conversation.members?.map((m) => m.user_id) || [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query.trim()}%,display_name.ilike.%${query.trim()}%`)
        .neq('id', user?.id || '')
        .limit(5);

      if (error) throw error;
      
      const filtered = (data || []).filter((p) => !memberIds.includes(p.id));
      setSearchResults(filtered);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (profileId: string) => {
    if (!conversation) return;
    setLoadingMember(profileId);
    try {
      const { error } = await supabase
        .from('conversation_members')
        .insert({
          conversation_id: conversation.id,
          user_id: profileId,
          role: 'member',
        });

      if (error) throw error;

      toast.success('Member added successfully!');
      setShowAddMember(false);
      setMemberSearchQuery('');
      setSearchResults([]);

      // Trigger store refresh for conversations
      const { data: list } = await supabase
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
        .order('updated_at', { ascending: false });
      
      if (list) {
        setConversations(list as any);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to add member');
    } finally {
      setLoadingMember(null);
    }
  };

  if (!conversation) return null;

  const handleCopyLink = () => {
    if (conversation.invite_link) {
      navigator.clipboard.writeText(`${window.location.origin}/invite/${conversation.invite_link}`);
      toast.success('Invite link copied!');
    }
  };

  const handleLeaveGroup = async () => {
    try {
      if (!user || !conversation || !myMember) return;
      const confirmLeave = window.confirm('Are you sure you want to leave this group?');
      if (!confirmLeave) return;

      const { error } = await supabase
        .from('conversation_members')
        .delete()
        .eq('id', myMember.id);

      if (error) throw error;
      toast.success('Left group');
      setRightPanel(false);
      setActiveConversationId(null);
    } catch (err: any) {
      console.error('Leave group error:', err);
      toast.error(err.message || 'Failed to leave group');
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-sidebar select-none">
      {/* Header Panel */}
      <div className="px-4 py-2 border-b border-divider flex items-center justify-between shrink-0">
        <h3 className="text-xs sm:text-sm font-semibold text-text-primary">Group Info</h3>
        <button
          onClick={() => setRightPanel(false)}
          className="p-1 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
        >
          <X size={16} />
        </button>
      </div>

      {/* Profile Details header */}
      <div className="flex flex-col items-center p-5 border-b border-divider shrink-0">
        <Avatar name={conversation.name || 'Group'} src={conversation.avatar_url} size="xl" />
        <h4 className="text-xs sm:text-sm font-bold text-text-primary mt-3.5 text-center truncate w-full">
          {conversation.name}
        </h4>
        <p className="text-[10px] text-text-secondary mt-0.5">
          {conversation.members?.length || 0} members
        </p>
      </div>

      {/* Info details lists */}
      <div className="p-4 space-y-3.5 border-b border-divider text-xs shrink-0">
        {conversation.description && (
          <div className="flex items-center gap-3">
            <Info size={14} className="text-text-secondary shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-text-primary text-2xs sm:text-xs leading-relaxed">
                {conversation.description}
              </p>
              <p className="text-[9px] text-text-secondary">Description</p>
            </div>
          </div>
        )}

        {conversation.invite_link && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Copy size={14} className="text-text-secondary shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-text-primary text-2xs sm:text-xs truncate">
                  {conversation.invite_link}
                </p>
                <p className="text-[9px] text-text-secondary">Invite Link</p>
              </div>
            </div>
            <button
              onClick={handleCopyLink}
              className="p-1 rounded bg-bg-hover hover:bg-bg-active text-accent transition-colors focus:outline-none"
            >
              <Copy size={12} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell size={14} className="text-text-secondary shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-text-primary text-2xs sm:text-xs">Notifications</p>
              <p className="text-[9px] text-text-secondary">{notificationsMuted ? 'Muted' : 'Enabled'}</p>
            </div>
          </div>
          <Toggle checked={!notificationsMuted} onChange={(val) => setNotificationsMuted(!val)} />
        </div>
      </div>

      {/* Add Member inline form */}
      {isAdminOrOwner && showAddMember && (
        <div className="p-4 border-b border-divider bg-bg-hover/10 space-y-2">
          <input
            type="text"
            value={memberSearchQuery}
            onChange={(e) => handleMemberSearch(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-bg-input border border-border text-text-primary text-[11px] rounded-md focus:outline-none focus:border-accent"
            placeholder="Search username or display name..."
            autoFocus
          />
          {isSearching && <p className="text-[10px] text-text-secondary">Searching...</p>}
          {!isSearching && searchResults.length === 0 && memberSearchQuery.trim() && (
            <p className="text-[10px] text-text-secondary">No users found</p>
          )}
          {searchResults.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto mt-1">
              {searchResults.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-1.5 rounded bg-bg-sidebar border border-border/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={p.display_name} src={p.avatar_url} size="xs" />
                    <div className="min-w-0 text-left">
                      <p className="text-[11px] font-semibold text-text-primary truncate">{p.display_name}</p>
                      <p className="text-[9px] text-text-secondary truncate">@{p.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddMember(p.id)}
                    disabled={loadingMember !== null}
                    className="px-2 py-0.5 rounded bg-accent text-white text-[10px] font-bold hover:bg-accent-hover transition-colors shrink-0"
                  >
                    {loadingMember === p.id ? 'Adding...' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members Label Header */}
      <div className="px-4 py-1.5 bg-bg-hover/30 border-b border-divider flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Users size={12} className="text-text-secondary" />
          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Members</span>
        </div>
        {isAdminOrOwner && (
          <button
            onClick={() => {
              setShowAddMember(!showAddMember);
              if (showAddMember) {
                setMemberSearchQuery('');
                setSearchResults([]);
              }
            }}
            className="p-1 rounded hover:bg-bg-hover text-accent hover:text-accent-hover transition-colors focus:outline-none"
            title="Add Member"
          >
            <UserPlus size={14} />
          </button>
        )}
      </div>

      {/* Members list body */}
      <div className="flex-1 overflow-y-auto divide-y divide-divider/50">
        {conversation.members?.map((m) => (
          <div key={m.id} className="px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                name={m.profile.display_name}
                src={m.profile.avatar_url}
                size="xs"
                isOnline={m.profile.is_online}
              />
              <div className="min-w-0">
                <p className="font-semibold text-text-primary text-2xs sm:text-xs truncate">
                  {m.profile.display_name}
                </p>
                <p className="text-[9px] text-text-secondary truncate">
                  @{m.profile.username}
                </p>
              </div>
            </div>
            {m.role !== 'member' && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-accent px-1.5 py-0.5 bg-accent-light rounded-full shrink-0">
                <Shield size={8} />
                <span className="capitalize">{m.role}</span>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Leave button */}
      <div className="p-3 border-t border-divider flex flex-col gap-2 shrink-0 bg-bg-hover/20">
        <button
          onClick={handleLeaveGroup}
          className="w-full py-2 flex items-center justify-center gap-2 rounded-md hover:bg-danger/10 text-xs font-semibold text-danger transition-colors focus:outline-none"
        >
          <LogOut size={14} />
          <span>Leave Group</span>
        </button>
      </div>
    </div>
  );
};
export default GroupInfoPanel;
