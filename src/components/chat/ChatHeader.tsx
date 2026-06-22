import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Search, Phone, MoreVertical, Video, BellOff, Trash2, ShieldAlert } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

export const ChatHeader: React.FC = () => {
  const { conversations, activeConversationId, setActiveConversationId } = useChatStore();
  const { isMobileView, setIsSidebarVisible, setRightPanel, rightPanelOpen } = useUIStore();
  const { user } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const conversation = conversations.find((c) => c.id === activeConversationId);

  if (!conversation) return null;

  const otherMember = conversation.members?.find((m) => m.user_id !== user?.id);
  const isOnline = conversation.type === 'direct' && otherMember?.profile?.is_online;

  const handleBack = () => {
    setActiveConversationId(null);
    setIsSidebarVisible(true);
  };

  const handleHeaderClick = () => {
    setRightPanel(!rightPanelOpen, conversation.type === 'group' ? 'group_info' : 'user_info');
  };

  const handleCall = () => {
    toast('Calling... (Coming soon)', { icon: '📞' });
  };

  const handleVideoCall = () => {
    toast('Starting video call... (Coming soon)', { icon: '📹' });
    setDropdownOpen(false);
  };

  const handleMute = () => {
    toast('Notifications muted', { icon: '🔕' });
    setDropdownOpen(false);
  };

  const handleClearHistory = () => {
    toast('History cleared', { icon: '🧹' });
    setDropdownOpen(false);
  };

  const handleDeleteChat = () => {
    toast('Conversation deleted', { icon: '🗑️' });
    setDropdownOpen(false);
  };

  return (
    <header className="px-4 py-2 bg-bg-sidebar border-b border-divider flex items-center justify-between select-none relative z-10 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Back button on mobile view */}
        {isMobileView && (
          <button
            onClick={handleBack}
            className="p-1 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
        )}

        {/* Conversation details trigger info panel */}
        <div
          onClick={handleHeaderClick}
          className="flex items-center gap-3 cursor-pointer min-w-0"
        >
          <Avatar
            name={conversation.name || 'Chat'}
            src={conversation.avatar_url}
            size="sm"
            isOnline={isOnline || false}
          />
          <div className="overflow-hidden">
            <h3 className="text-xs sm:text-sm font-semibold text-text-primary truncate">
              {conversation.name}
            </h3>
            <p className="text-[10px] text-text-secondary truncate">
              {conversation.type === 'group'
                ? `${conversation.members?.length || 0} members`
                : isOnline
                ? 'online'
                : 'offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Header Menu buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => toast('Search in chat (Coming soon)', { icon: '🔍' })}
          className="p-1.5 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
        >
          <Search size={16} />
        </button>

        <button
          onClick={handleCall}
          className="p-1.5 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
        >
          <Phone size={16} />
        </button>

        {/* Dropdown Options */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="p-1.5 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
          >
            <MoreVertical size={16} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-8 w-40 bg-bg-elevated border border-border shadow-lg rounded-md z-20 py-1">
              <button
                onClick={handleVideoCall}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-bg-hover text-2xs sm:text-xs text-text-primary transition-colors text-left"
              >
                <Video size={13} className="text-text-secondary" />
                <span>Video Call</span>
              </button>

              <button
                onClick={handleMute}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-bg-hover text-2xs sm:text-xs text-text-primary transition-colors text-left"
              >
                <BellOff size={13} className="text-text-secondary" />
                <span>Mute</span>
              </button>

              <button
                onClick={handleClearHistory}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-bg-hover text-2xs sm:text-xs text-text-primary transition-colors text-left"
              >
                <Trash2 size={13} className="text-text-secondary" />
                <span>Clear History</span>
              </button>

              <button
                onClick={handleDeleteChat}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-bg-hover text-2xs sm:text-xs text-danger hover:text-danger-hover transition-colors text-left font-medium"
              >
                <ShieldAlert size={13} />
                <span>Delete Chat</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
export default ChatHeader;
