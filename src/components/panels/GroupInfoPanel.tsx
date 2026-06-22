import React, { useState } from 'react';
import { X, Copy, Info, Users, Bell, LogOut, Shield } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import Avatar from '@/components/ui/Avatar';
import Toggle from '@/components/ui/Toggle';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

export const GroupInfoPanel: React.FC = () => {
  const { setRightPanel } = useUIStore();
  const { conversations, activeConversationId } = useChatStore();
  const { user } = useAuthStore();
  const [notificationsMuted, setNotificationsMuted] = useState(false);

  const conversation = conversations.find((c) => c.id === activeConversationId);

  if (!conversation) return null;

  const handleCopyLink = () => {
    if (conversation.invite_link) {
      navigator.clipboard.writeText(`${window.location.origin}/invite/${conversation.invite_link}`);
      toast.success('Invite link copied!');
    }
  };

  const handleLeaveGroup = () => {
    toast('Leaving group... (Coming soon)', { icon: '🚪' });
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

      {/* Members Label Header */}
      <div className="px-4 py-1.5 bg-bg-hover/30 border-b border-divider flex items-center gap-2 shrink-0">
        <Users size={12} className="text-text-secondary" />
        <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Members</span>
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
