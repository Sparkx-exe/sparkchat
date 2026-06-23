import React, { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Camera } from 'lucide-react';

export const EditProfileModal: React.FC = () => {
  const { activeModals, setModal } = useUIStore();
  const { profile, setProfile } = useAuthStore();
  
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // limit image size: 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setLoadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `${profile.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(updatedProfile as any);
      toast.success('Profile picture updated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to upload profile picture');
    } finally {
      setLoadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile) return;
    setLoadingAvatar(true);
    try {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(updatedProfile as any);
      toast.success('Profile picture removed successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to remove profile picture');
    } finally {
      setLoadingAvatar(false);
    }
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

  if (!profile) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Profile Details">
      <form onSubmit={handleSave} className="space-y-4">
        {/* Profile Picture Uploader */}
        <div className="flex flex-col items-center justify-center pb-4 border-b border-divider mb-4 select-none">
          <div className="relative group cursor-pointer w-20 h-20 rounded-full">
            <div className="w-full h-full rounded-full overflow-hidden border border-border flex items-center justify-center relative bg-bg-hover">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold bg-accent/20 text-accent uppercase">
                  {displayName ? displayName[0] : (profile.display_name ? profile.display_name[0] : 'U')}
                </div>
              )}

              {loadingAvatar && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[9px] font-semibold">
                  Uploading...
                </div>
              )}

              {!loadingAvatar && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-150 rounded-full"
                >
                  <Camera size={18} className="mb-0.5" />
                  <span className="text-[9px] font-medium">Change</span>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={loadingAvatar}
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loadingAvatar}
              className="text-[11px] font-semibold text-accent hover:text-accent-hover transition-colors"
            >
              Upload Photo
            </button>
            {profile.avatar_url && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={loadingAvatar}
                className="text-[11px] font-semibold text-danger hover:text-danger-hover transition-colors"
              >
                Remove Photo
              </button>
            )}
          </div>
        </div>
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
