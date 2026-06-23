import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import HamburgerMenu from './HamburgerMenu';
import { AnimatePresence } from 'framer-motion';

export const SidebarHeader: React.FC = () => {
  const { searchQuery, setSearchQuery } = useUIStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative px-4 py-2.5 flex items-center gap-3 border-b border-divider bg-bg-sidebar select-none">
      {/* Hamburger Toggle button */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
        >
          <Menu size={18} />
        </button>

        {/* Floating Menu overlay */}
        <AnimatePresence>
          {menuOpen && <HamburgerMenu onClose={() => setMenuOpen(false)} />}
        </AnimatePresence>
      </div>

      {/* Search Input bar */}
      <div className="flex-1 relative flex items-center">
        <span className="absolute left-3 text-text-placeholder/70">
          <Search size={14} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-8 py-1.5 rounded-full bg-bg-input/60 border border-border/30 text-text-primary placeholder-text-placeholder text-xs focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all duration-200"
          placeholder="Search"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 p-0.5 rounded-full hover:bg-bg-hover text-text-secondary hover:text-text-primary focus:outline-none transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
};
export default SidebarHeader;
