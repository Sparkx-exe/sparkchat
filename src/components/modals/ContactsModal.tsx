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
import { Profile, Contact } from '@/types';
import { Search, UserPlus, Trash2, ShieldAlert, MessageSquare } from 'lucide-react';

export const ContactsModal: React.FC = () => {
  const { activeModals, setModal, isMobileView, setIsSidebarVisible } = useUIStore();
  const { user } = useAuthStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search input for adding new contact
  const [addQuery, setAddQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  const isOpen = activeModals['contacts'] || false;

  const handleClose = () => {
    setActiveTab('list');
    setAddQuery('');
    setSearchResults([]);
    setModal('contacts', false);
  };

  // Fetch contacts list
  const fetchContacts = async () => {
    if (!user || !isOpen) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          user_id,
          contact_id,
          nickname,
          is_blocked,
          created_at,
          contact_profile:profiles!contacts_contact_id_fkey(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setContacts(data || []);
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user, isOpen]);

  // Global user search for Adding Contacts
  useEffect(() => {
    if (activeTab !== 'add' || addQuery.trim().length < 2 || !user) {
      setSearchResults([]);
      return;
    }

    const searchUsers = async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${addQuery}%,display_name.ilike.%${addQuery}%`)
          .neq('id', user.id)
          .limit(8);

        if (error) throw error;
        // Filter out profiles that are already contacts
        const filtered = (data || []).filter(
          (p) => !contacts.some((c) => c.contact_id === p.id)
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error('Add contact search error:', err);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [addQuery, activeTab, contacts, user]);

  // Add Contact Action
  const handleAddContact = async (profile: Profile) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          contact_id: profile.id,
          nickname: profile.display_name,
        });

      if (error) throw error;
      toast.success(`${profile.display_name} added to contacts!`);
      setActiveTab('list');
      setAddQuery('');
      setSearchResults([]);
      fetchContacts();
    } catch (err: any) {
      console.error('Add contact error:', err);
      toast.error(err.message || 'Failed to add contact');
    }
  };

  // Delete Contact Action
  const handleDeleteContact = async (contactId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('user_id', user.id)
        .eq('contact_id', contactId);

      if (error) throw error;
      toast.success('Contact removed');
      fetchContacts();
    } catch (err: any) {
      console.error('Delete contact error:', err);
      toast.error(err.message || 'Failed to remove contact');
    }
  };

  // Toggle Block Contact Action
  const handleToggleBlockContact = async (contact: any) => {
    if (!user) return;
    const newStatus = !contact.is_blocked;
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ is_blocked: newStatus })
        .eq('user_id', user.id)
        .eq('contact_id', contact.contact_id);

      if (error) throw error;
      toast.success(newStatus ? 'Contact blocked' : 'Contact unblocked');
      fetchContacts();
    } catch (err: any) {
      console.error('Block contact error:', err);
      toast.error(err.message || 'Failed to update contact block status');
    }
  };

  // Start Chat Action
  const handleStartChat = async (profile: Profile) => {
    if (!user) return;
    try {
      const { data: convId, error } = await supabase.rpc(
        'get_or_create_direct_conversation',
        { user_a: user.id, user_b: profile.id }
      );
      if (error) throw error;

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
      console.error('Error starting chat from contact:', err);
      toast.error('Failed to start chat');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Contacts">
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
            My Contacts
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-1 rounded text-2xs sm:text-xs font-semibold capitalize transition-all ${
              activeTab === 'add'
                ? 'bg-bg-sidebar text-accent shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Add Contact
          </button>
        </div>

        {/* TAB 1: Contacts List */}
        {activeTab === 'list' && (
          <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1 select-none">
            {loading && contacts.length === 0 ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : contacts.length > 0 ? (
              contacts.map((c) => {
                const profile = c.contact_profile;
                if (!profile) return null;
                return (
                  <div
                    key={c.contact_id}
                    className={`flex items-center gap-3 px-3.5 py-2 mx-0.5 my-1 transition-all rounded-xl border border-[var(--border-subtle)] bg-bg-input hover:border-[var(--border)] shadow-xs ${
                      c.is_blocked ? 'opacity-60' : ''
                    }`}
                  >
                    <Avatar name={profile.display_name} src={profile.avatar_url} size="xs" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-text-primary truncate">{profile.display_name}</p>
                      <p className="text-[10px] text-text-secondary truncate">
                        {c.is_blocked ? 'Blocked' : profile.is_online ? 'online' : 'offline'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {/* Message icon */}
                      <button
                        onClick={() => handleStartChat(profile)}
                        title="Start Chat"
                        className="p-1 rounded hover:bg-bg-hover text-accent"
                      >
                        <MessageSquare size={13} />
                      </button>
                      {/* Block icon */}
                      <button
                        onClick={() => handleToggleBlockContact(c)}
                        title={c.is_blocked ? 'Unblock Contact' : 'Block Contact'}
                        className={`p-1 rounded hover:bg-bg-hover ${
                          c.is_blocked ? 'text-warning' : 'text-text-secondary'
                        }`}
                      >
                        <ShieldAlert size={13} />
                      </button>
                      {/* Delete icon */}
                      <button
                        onClick={() => handleDeleteContact(c.contact_id)}
                        title="Remove Contact"
                        className="p-1 rounded hover:bg-bg-hover text-danger"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-text-placeholder text-center py-8">
                Your contact list is empty. Go to "Add Contact" to grow your list!
              </p>
            )}
          </div>
        )}

        {/* TAB 2: Add Contacts */}
        {activeTab === 'add' && (
          <div className="space-y-4">
            <div className="relative flex items-center">
              <span className="absolute left-3 text-text-placeholder">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-bg-input border border-border text-text-primary placeholder-text-placeholder text-xs rounded-md focus:outline-none focus:border-accent"
                placeholder="Search username or display name..."
                disabled={searching && searchResults.length === 0}
              />
              {searching && (
                <span className="absolute right-3">
                  <Spinner size="sm" />
                </span>
              )}
            </div>

            <div className="max-h-[240px] overflow-y-auto space-y-1.5 pr-1 select-none">
              {searchResults.length > 0 ? (
                searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleAddContact(p)}
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
                addQuery.trim().length >= 2 && !searching && (
                  <p className="text-xs text-text-placeholder text-center py-6">
                    No matching users found
                  </p>
                )
              )}
              {addQuery.trim().length < 2 && (
                <p className="text-xs text-text-placeholder text-center py-6">
                  Type at least 2 characters to search global users...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
export default ContactsModal;
