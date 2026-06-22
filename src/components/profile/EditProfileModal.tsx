import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export const EditProfileModal: React.FC = () => {
  const { activeModals, setModal } = useUIStore();
  const { profile, setProfile } = useAuthStore();
  
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const isOpen = activeModals['editProfile'] || false;

  useEffect(() => {
    if (profile && isOpen) {
      setDisplayName(profile.display_name);
      setUsername(profile.username);
      setBio(profile.bio || '');
      setPhone(profile.phone || '');
    }
  }, [profile, isOpen]);

  const handleClose = () => {
    setModal('editProfile', false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          username: username.trim().toLowerCase(),
          bio: bio.trim() || null,
          phone: phone.trim() || null,
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data as any);
      toast.success('Profile updated successfully!');
      handleClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Profile Details">
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Display Name *</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border text-text-primary text-xs rounded-md focus:outline-none focus:border-accent"
            placeholder="John Doe"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Username *</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
            className="w-full px-3 py-2 bg-bg-input border border-border text-text-primary text-xs rounded-md focus:outline-none focus:border-accent"
            placeholder="johndoe"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border text-text-primary text-xs rounded-md focus:outline-none focus:border-accent"
            placeholder="+1 555 123 4567"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border text-text-primary text-xs rounded-md focus:outline-none focus:border-accent h-20 resize-none"
            placeholder="Tell us about yourself..."
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors flex items-center justify-center shadow-xs"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </Modal>
  );
};
export default EditProfileModal;
