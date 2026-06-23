import React from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export const ChatFolderTabs: React.FC = () => {
  const { folders, activeFolderId, setActiveFolderId } = useChatStore();
  const { setModal } = useUIStore();

  return (
    <div className="flex items-center px-4 py-2 border-b border-divider bg-bg-sidebar select-none overflow-x-auto scrollbar-none w-full shrink-0">
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Default 'All' Tab */}
        <button
          onClick={() => setActiveFolderId(null)}
          className={`px-3 py-1 rounded-full text-2xs sm:text-xs font-semibold relative select-none focus:outline-none transition-colors duration-200 ${
            activeFolderId === null
              ? 'text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {activeFolderId === null && (
            <motion.div
              layoutId="activeFolderTab"
              className="absolute inset-0 bg-gradient-to-r from-accent to-accent-hover rounded-full z-0 shadow-sm"
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            />
          )}
          <span className="relative z-10">All</span>
        </button>

        {/* Custom Folder Tabs */}
        {folders.map((folder) => {
          const isActive = activeFolderId === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => setActiveFolderId(folder.id)}
              className={`px-3 py-1 rounded-full text-2xs sm:text-xs font-semibold flex items-center gap-1 relative select-none focus:outline-none transition-colors duration-200 ${
                isActive
                  ? 'text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeFolderTab"
                  className="absolute inset-0 bg-gradient-to-r from-accent to-accent-hover rounded-full z-0 shadow-sm"
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                />
              )}
              <span className="relative z-10">{folder.emoji}</span>
              <span className="relative z-10">{folder.name}</span>
            </button>
          );
        })}

        {/* Create Folder button */}
        <button
          onClick={() => setModal('chatFolders', true)}
          className="p-1 rounded-full text-text-secondary hover:bg-accent/10 hover:text-accent transition-colors focus:outline-none relative z-10"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
};
export default ChatFolderTabs;
