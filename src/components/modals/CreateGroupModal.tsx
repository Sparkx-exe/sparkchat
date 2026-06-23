import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useUIStore } from '@/stores/uiStore';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import toast from 'react-hot-toast';

export const CreateGroupModal: React.FC = () => {
  const { activeModals, setModal } = useUIStore();
  const { user } = useAuthStore();
  const { setConversations } = useChatStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const isOpen = activeModals['createGroup'] || false;

  const handleClose = () => {
    setName('');
    setDescription('');
    setModal('createGroup', false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setLoading(true);

    try {
      const convId = crypto.randomUUID();
      const { error: convError } = await supabase
        .from('conversations')
        .insert({
          id: convId,
          type: 'group',
          name: name.trim(),
          description: description.trim() || null,
          created_by: user.id,
        });

      if (convError) throw convError;

      const { error: memberError } = await supabase
        .from('conversation_members')
        .insert({
          conversation_id: convId,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      toast.success('Group created successfully!');
      handleClose();

      // Refetch updated list
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
      toast.error(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Group">
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Group Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border text-text-primary text-xs rounded-md focus:outline-none focus:border-accent"
            placeholder="e.g. Spark Developers"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border text-text-primary text-xs rounded-md focus:outline-none focus:border-accent h-20 resize-none"
            placeholder="What is this group about?"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors flex items-center justify-center shadow-xs"
        >
          {loading ? 'Creating...' : 'Create Group'}
        </button>
      </form>
    </Modal>
  );
};
export default CreateGroupModal;
