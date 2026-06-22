import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Moon, Layers, Bug } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import Toggle from '@/components/ui/Toggle';
import toast from 'react-hot-toast';

interface MoreSubMenuProps {
  onBack: () => void;
  onClose: () => void;
}

export const MoreSubMenu: React.FC<MoreSubMenuProps> = ({ onBack, onClose }) => {
  const { theme, toggleTheme } = useThemeStore();

  const handleToggleUIFeatures = () => {
    toast('Simplified UI mode toggled (Coming soon)', { icon: '✨' });
  };

  const handleBugReport = () => {
    toast('Bug reporter loaded (Coming soon)', { icon: '🐛' });
  };

  return (
    <motion.div
      key="more-menu"
      initial={{ x: 180, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 180, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="py-0.5"
    >
      {/* Subheader */}
      <div className="px-4 py-1.5 border-b border-divider flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-xs font-semibold text-text-primary">More Options</span>
      </div>

      {/* Options list */}
      <div className="mt-1">
        <div className="w-full px-4 py-1.5 flex items-center justify-between text-xs text-text-primary select-none">
          <div className="flex items-center gap-3">
            <Moon size={14} className="text-text-secondary" />
            <span>Night Mode</span>
          </div>
          <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
        </div>

        <button
          onClick={handleToggleUIFeatures}
          className="w-full px-4 py-1.5 flex items-center gap-3 hover:bg-bg-hover text-xs text-text-primary transition-colors text-left"
        >
          <Layers size={14} className="text-text-secondary" />
          <span>Simplified UI</span>
        </button>

        <button
          onClick={handleBugReport}
          className="w-full px-4 py-1.5 flex items-center gap-3 hover:bg-bg-hover text-xs text-text-primary transition-colors text-left"
        >
          <Bug size={14} className="text-text-secondary" />
          <span>Report a Bug</span>
        </button>
      </div>
    </motion.div>
  );
};
export default MoreSubMenu;
