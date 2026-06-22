import React, { useState } from 'react';
import { X, Phone, AtSign, Info, Bell, Image, FileText, Link, AlertTriangle } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import Avatar from '@/components/ui/Avatar';
import Toggle from '@/components/ui/Toggle';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

export const UserInfoPanel: React.FC = () => {
  const { setRightPanel } = useUIStore();
  const { conversations, activeConversationId } = useChatStore();
  const { user } = useAuthStore();
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<'media' | 'files' | 'links'>('media');

  const conversation = conversations.find((c) => c.id === activeConversationId);

  if (!conversation) return null;

  const otherMember = conversation.members?.find((m) => m.user_id !== user?.id);
  const profile = otherMember?.profile;

  if (!profile) return null;

  const handleBlockUser = () => {
    toast('User blocked', { icon: '🚫' });
  };

  return (
    <div className="flex flex-col h-full bg-bg-sidebar select-none">
      {/* Header Panel */}
      <div className="px-4 py-2 border-b border-divider flex items-center justify-between shrink-0">
        <h3 className="text-xs sm:text-sm font-semibold text-text-primary">User Info</h3>
        <button
          onClick={() => setRightPanel(false)}
          className="p-1 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
        >
          <X size={16} />
        </button>
      </div>

      {/* Profile Details header */}
      <div className="flex flex-col items-center p-5 border-b border-divider shrink-0">
        <Avatar name={profile.display_name} src={profile.avatar_url} size="xl" isOnline={profile.is_online} />
        <h4 className="text-xs sm:text-sm font-bold text-text-primary mt-3.5 text-center truncate w-full">
          {profile.display_name}
        </h4>
        <p className="text-[10px] text-text-secondary mt-0.5">
          {profile.is_online ? 'online' : 'offline'}
        </p>
      </div>

      {/* Info details lists */}
      <div className="p-4 space-y-3.5 border-b border-divider text-xs shrink-0">
        {profile.phone && (
          <div className="flex items-center gap-3">
            <Phone size={14} className="text-text-secondary shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-text-primary text-2xs sm:text-xs">{profile.phone}</p>
              <p className="text-[9px] text-text-secondary">Phone number</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <AtSign size={14} className="text-text-secondary shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-text-primary text-2xs sm:text-xs">@{profile.username}</p>
            <p className="text-[9px] text-text-secondary">Username</p>
          </div>
        </div>

        {profile.bio && (
          <div className="flex items-center gap-3">
            <Info size={14} className="text-text-secondary shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-text-primary text-2xs sm:text-xs leading-relaxed">{profile.bio}</p>
              <p className="text-[9px] text-text-secondary">Bio</p>
            </div>
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

      {/* Media Tabs strip */}
      <div className="flex border-b border-divider text-2xs sm:text-xs text-text-secondary shrink-0 select-none">
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 font-semibold transition-colors focus:outline-none ${
            activeTab === 'media'
              ? 'border-accent text-accent'
              : 'border-transparent hover:text-text-primary'
          }`}
        >
          <Image size={12} />
          <span>Media</span>
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 font-semibold transition-colors focus:outline-none ${
            activeTab === 'files'
              ? 'border-accent text-accent'
              : 'border-transparent hover:text-text-primary'
          }`}
        >
          <FileText size={12} />
          <span>Files</span>
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 font-semibold transition-colors focus:outline-none ${
            activeTab === 'links'
              ? 'border-accent text-accent'
              : 'border-transparent hover:text-text-primary'
          }`}
        >
          <Link size={12} />
          <span>Links</span>
        </button>
      </div>

      {/* Tabs display content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center">
        {activeTab === 'media' && (
          <div className="grid grid-cols-3 gap-1.5 w-full">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="aspect-square bg-bg-hover rounded border border-border-subtle flex items-center justify-center text-text-placeholder text-[10px]">
                Placeholder
              </div>
            ))}
          </div>
        )}
        {activeTab !== 'media' && (
          <p className="text-[10px] text-text-placeholder">No shared items found</p>
        )}
      </div>

      {/* Footer controls */}
      <div className="p-3 border-t border-divider flex flex-col gap-2 shrink-0 bg-bg-hover/20">
        <button
          onClick={handleBlockUser}
          className="w-full py-2 flex items-center justify-center gap-2 rounded-md hover:bg-danger/10 text-xs font-semibold text-danger transition-colors focus:outline-none"
        >
          <AlertTriangle size={14} />
          <span>Block User</span>
        </button>
      </div>
    </div>
  );
};
export default UserInfoPanel;
