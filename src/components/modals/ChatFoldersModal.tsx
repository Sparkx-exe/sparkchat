import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Trash2, FolderPlus, Info } from 'lucide-react';

export const ChatFoldersModal: React.FC = () => {
  const { activeModals, setModal } = useUIStore();
  const { user } = useAuthStore();
  const { folders, setFolders, setActiveFolderId } = useChatStore();

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [folderName, setFolderName] = useState('');
  const [folderEmoji, setFolderEmoji] = useState('📁');
  const [includeDirect, setIncludeDirect] = useState(true);
  const [includeGroup, setIncludeGroup] = useState(true);
  const [includeSaved, setIncludeSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const isOpen = activeModals['chatFolders'] || false;

  const handleClose = () => {
    setActiveTab('list');
    setFolderName('');
    setFolderEmoji('📁');
    setIncludeDirect(true);
    setIncludeGroup(true);
    setIncludeSaved(false);
    setModal('chatFolders', false);
  };

  const fetchFolders = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('chat_folders')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setFolders(data || []);
    } catch (err: any) {
      console.error('Error fetching folders:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim() || !user) return;

    const includeTypes: string[] = [];
    if (includeDirect) includeTypes.push('direct');
    if (includeGroup) includeTypes.push('group');
    if (includeSaved) includeTypes.push('saved');

    if (includeTypes.length === 0) {
      toast.error('Select at least one chat type to include!');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('chat_folders')
        .insert({
          user_id: user.id,
          name: folderName.trim(),
          emoji: folderEmoji.trim() || '📁',
          include_types: includeTypes,
          sort_order: folders.length,
        });

      if (error) throw error;
      toast.success('Folder created successfully!');
      handleClose();
      fetchFolders();
    } catch (err: any) {
      console.error('Error creating folder:', err);
      toast.error(err.message || 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (folderId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('chat_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
      toast.success('Folder deleted');
      setActiveFolderId(null);
      fetchFolders();
    } catch (err: any) {
      console.error('Error deleting folder:', err);
      toast.error(err.message || 'Failed to delete folder');
    }
  };

  const emojis = ['📁', '💬', '🚀', '🛠️', '🎓', '🎨', '💼', '📌', '🔥', '🎮', '💡', '🎵'];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Chat Folders">
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex bg-bg-input p-0.5 rounded-md border border-border select-none">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-1 rounded text-2xs sm:text-xs font-semibold capitalize transition-all ${
              activeTab === 'list'
                ? 'bg-bg-sidebar text-accent shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            My Folders
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-1 rounded text-2xs sm:text-xs font-semibold capitalize transition-all ${
              activeTab === 'create'
                ? 'bg-bg-sidebar text-accent shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Create Folder
          </button>
        </div>

        {/* TAB 1: Folders List */}
        {activeTab === 'list' && (
          <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1 select-none">
            {folders.length > 0 ? (
              folders.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 mx-0.5 my-1 transition-all rounded-xl border border-[var(--border-subtle)] bg-bg-input hover:border-[var(--border)] shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{f.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">{f.name}</p>
                      <p className="text-[9px] text-text-secondary truncate capitalize">
                        Includes: {f.include_types?.join(', ') || 'none'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="p-1 rounded hover:bg-bg-hover text-danger shrink-0 ml-2"
                    title="Delete Folder"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 space-y-2">
                <Info size={24} className="mx-auto text-text-placeholder" />
                <p className="text-xs text-text-placeholder max-w-[200px] mx-auto">
                  Use folders to group different types of chats (e.g. only Direct Messages or only Groups).
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Create Folder */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4 text-xs select-none">
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Folder Name *</label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border text-text-primary text-xs rounded-md focus:outline-none focus:border-accent"
                placeholder="e.g. Work or Personal"
                required
                disabled={loading}
              />
            </div>

            {/* Emoji Selector */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Folder Icon / Emoji</label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-bg-input border border-border rounded-md">
                {emojis.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setFolderEmoji(em)}
                    className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-all hover:bg-bg-hover ${
                      folderEmoji === em ? 'bg-bg-active border border-accent/20 scale-105' : ''
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Include Chat Types Checkboxes */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Included Chat Types</label>
              <div className="space-y-2 p-3 bg-bg-input border border-border rounded-md">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDirect}
                    onChange={(e) => setIncludeDirect(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-accent focus:ring-accent accent-accent cursor-pointer"
                  />
                  <span className="text-text-primary font-medium">Direct Messages (DMs)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeGroup}
                    onChange={(e) => setIncludeGroup(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-accent focus:ring-accent accent-accent cursor-pointer"
                  />
                  <span className="text-text-primary font-medium">Group Chats</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSaved}
                    onChange={(e) => setIncludeSaved(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-accent focus:ring-accent accent-accent cursor-pointer"
                  />
                  <span className="text-text-primary font-medium">Saved Messages</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !folderName.trim()}
              className="w-full py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors flex items-center justify-center shadow-xs"
            >
              {loading ? 'Creating...' : 'Create Folder'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};
export default ChatFoldersModal;
