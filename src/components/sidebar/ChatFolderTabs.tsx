import React from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { Plus } from 'lucide-react';

export const ChatFolderTabs: React.FC = () => {
  const { folders, activeFolderId, setActiveFolderId } = useChatStore();
  const { setModal } = useUIStore();

  return (
    <div className="flex items-center px-4 py-2 border-b border-divider bg-bg-sidebar select-none overflow-x-auto scrollbar-none w-full shrink-0">
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Default 'All' Tab */}
        <button
          onClick={() => setActiveFolderId(null)}
          className={`px-3 py-1 rounded-full text-2xs sm:text-xs font-semibold transition-colors duration-100 ${
            activeFolderId === null
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
          }`}
        >
          All
        </button>

        {/* Custom Folder Tabs */}
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setActiveFolderId(folder.id)}
            className={`px-3 py-1 rounded-full text-2xs sm:text-xs font-semibold flex items-center gap-1 transition-colors duration-100 ${
              activeFolderId === folder.id
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }`}
          >
            <span>{folder.emoji}</span>
            <span>{folder.name}</span>
          </button>
        ))}

        {/* Create Folder button */}
        <button
          onClick={() => setModal('chatFolders', true)}
          className="p-1 rounded-full text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors focus:outline-none"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
};
export default ChatFolderTabs;
