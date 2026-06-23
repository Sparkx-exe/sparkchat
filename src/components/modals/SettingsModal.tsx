import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import {
  User,
  Shield,
  Palette,
  Moon,
  Sun,
  Lock,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';

export const SettingsModal: React.FC = () => {
  const { activeModals, setModal } = useUIStore();
  const { profile, setProfile } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'appearance'>('profile');
  const [loading, setLoading] = useState(false);

  // Privacy states
  const [showLastSeen, setShowLastSeen] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [showPhone, setShowPhone] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [whoCanAddToGroups, setWhoCanAddToGroups] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [twoStepEnabled, setTwoStepEnabled] = useState(false);

  const isOpen = activeModals['settings'] || false;

  useEffect(() => {
    if (profile && isOpen) {
      setShowLastSeen(profile.show_last_seen || 'everyone');
      setShowPhone(profile.show_phone || 'everyone');
      setWhoCanAddToGroups(profile.who_can_add_to_groups || 'everyone');
      setTwoStepEnabled(profile.two_step_enabled || false);
    }
  }, [profile, isOpen]);

  const handleClose = () => {
    setModal('settings', false);
  };

  const savePrivacySettings = async (updates: any) => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data as any);
      toast.success('Settings updated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Settings" maxWidth="max-w-xl">
      <div className="flex gap-4 min-h-[350px]">
        {/* Left Sidebar */}
        <div className="w-1/3 border-r border-divider pr-4 flex flex-col gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full px-3 py-2 flex items-center gap-2.5 rounded-md text-xs font-medium transition-colors text-left ${
              activeTab === 'profile'
                ? 'bg-accent text-white'
                : 'hover:bg-bg-hover text-text-primary'
            }`}
          >
            <User size={15} />
            <span>My Account</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`w-full px-3 py-2 flex items-center gap-2.5 rounded-md text-xs font-medium transition-colors text-left ${
              activeTab === 'privacy'
                ? 'bg-accent text-white'
                : 'hover:bg-bg-hover text-text-primary'
            }`}
          >
            <Shield size={15} />
            <span>Privacy & Security</span>
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full px-3 py-2 flex items-center gap-2.5 rounded-md text-xs font-medium transition-colors text-left ${
              activeTab === 'appearance'
                ? 'bg-accent text-white'
                : 'hover:bg-bg-hover text-text-primary'
            }`}
          >
            <Palette size={15} />
            <span>Appearance</span>
          </button>
        </div>

        {/* Right Content */}
        <div className="flex-1 pl-2 overflow-y-auto">
          {activeTab === 'profile' && profile && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-bg-hover rounded-lg">
                <Avatar
                  name={profile.display_name}
                  src={profile.avatar_url}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-text-primary truncate">{profile.display_name}</p>
                  <p className="text-[10px] text-text-secondary truncate">@{profile.username}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Phone Number</label>
                  <p className="text-xs text-text-primary bg-bg-input px-3 py-2 rounded-md border border-border">
                    {profile.phone || 'No phone number added'}
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Bio</label>
                  <p className="text-xs text-text-primary bg-bg-input px-3 py-2 rounded-md border border-border min-h-[50px] whitespace-pre-wrap">
                    {profile.bio || 'No bio added'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  handleClose();
                  setModal('editProfile', true);
                }}
                className="w-full py-2 border border-accent hover:bg-accent/5 text-accent text-xs font-semibold rounded-md transition-colors"
              >
                Edit Profile Details
              </button>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-3">
                <h4 className="font-semibold text-text-primary text-xs border-b border-divider pb-1">Privacy</h4>
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-text-secondary uppercase">Show Last Seen</label>
                  <div className="flex bg-bg-input p-0.5 rounded-md border border-border">
                    {(['everyone', 'contacts', 'nobody'] as const).map((val) => (
                      <button
                        key={val}
                        onClick={() => {
                          setShowLastSeen(val);
                          savePrivacySettings({ show_last_seen: val });
                        }}
                        disabled={loading}
                        className={`flex-1 py-1 rounded text-[10px] font-medium capitalize transition-all ${
                          showLastSeen === val
                            ? 'bg-bg-sidebar text-accent shadow-xs'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-text-secondary uppercase">Show Phone Number</label>
                  <div className="flex bg-bg-input p-0.5 rounded-md border border-border">
                    {(['everyone', 'contacts', 'nobody'] as const).map((val) => (
                      <button
                        key={val}
                        onClick={() => {
                          setShowPhone(val);
                          savePrivacySettings({ show_phone: val });
                        }}
                        disabled={loading}
                        className={`flex-1 py-1 rounded text-[10px] font-medium capitalize transition-all ${
                          showPhone === val
                            ? 'bg-bg-sidebar text-accent shadow-xs'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-text-secondary uppercase">Who Can Add Me to Groups</label>
                  <div className="flex bg-bg-input p-0.5 rounded-md border border-border">
                    {(['everyone', 'contacts', 'nobody'] as const).map((val) => (
                      <button
                        key={val}
                        onClick={() => {
                          setWhoCanAddToGroups(val);
                          savePrivacySettings({ who_can_add_to_groups: val });
                        }}
                        disabled={loading}
                        className={`flex-1 py-1 rounded text-[10px] font-medium capitalize transition-all ${
                          whoCanAddToGroups === val
                            ? 'bg-bg-sidebar text-accent shadow-xs'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="font-semibold text-text-primary text-xs border-b border-divider pb-1">Security</h4>
                
                <div className="flex items-center justify-between p-2 bg-bg-hover rounded-md border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-text-secondary" />
                    <div>
                      <p className="font-medium text-text-primary">Two-Step Verification</p>
                      <p className="text-[10px] text-text-secondary">Require a password when logging in</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={twoStepEnabled}
                    disabled={loading}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setTwoStepEnabled(checked);
                      savePrivacySettings({ two_step_enabled: checked });
                    }}
                    className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-text-primary text-xs border-b border-divider pb-1">Theme Settings</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                      theme === 'light'
                        ? 'border-accent bg-accent/5'
                        : 'border-border bg-bg-hover hover:border-text-secondary'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-yellow-500 shadow-sm">
                      <Sun size={18} />
                    </div>
                    <span className="text-xs font-semibold text-text-primary">Light Theme</span>
                  </button>

                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                      theme === 'dark'
                        ? 'border-accent bg-accent/5'
                        : 'border-border bg-bg-hover hover:border-text-secondary'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-blue-400 shadow-sm">
                      <Moon size={18} />
                    </div>
                    <span className="text-xs font-semibold text-text-primary">Dark Theme</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
