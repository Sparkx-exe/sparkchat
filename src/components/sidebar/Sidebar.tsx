import React, { useState } from 'react';
import SidebarHeader from './SidebarHeader';
import ChatFolderTabs from './ChatFolderTabs';
import ChatList from './ChatList';
import SearchResults from './SearchResults';
import { useUIStore } from '@/stores/uiStore';
import { MessageSquare, Users, PenTool, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Sidebar: React.FC = () => {
  const { searchQuery, setModal } = useUIStore();
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <aside className="w-full md:w-[340px] border-r border-divider bg-bg-sidebar flex flex-col h-full shrink-0 relative z-20">
      <SidebarHeader />
      
      {searchQuery ? (
        <SearchResults />
      ) : (
        <>
          <ChatFolderTabs />
          <div className="flex-1 overflow-hidden relative">
            <ChatList />
            
            {/* Floating Action Button */}
            <div className="absolute bottom-6 right-6 z-30">
              <AnimatePresence>
                {fabOpen && (
                  <div className="flex flex-col gap-2.5 mb-2.5 items-end">
                    {/* New Group */}
                    <motion.button
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      whileHover={{ scale: 1.05, x: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setModal('createGroup', true);
                        setFabOpen(false);
                      }}
                      className="flex items-center gap-2 px-3.5 py-2 bg-bg-elevated border border-border-subtle shadow-md rounded-full text-[11px] font-semibold text-text-primary hover:bg-bg-hover transition-colors focus:outline-none"
                    >
                      <Users size={14} className="text-accent" />
                      <span>New Group</span>
                    </motion.button>

                    {/* New Message */}
                    <motion.button
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      whileHover={{ scale: 1.05, x: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setModal('newChat', true);
                        setFabOpen(false);
                      }}
                      className="flex items-center gap-2 px-3.5 py-2 bg-bg-elevated border border-border-subtle shadow-md rounded-full text-[11px] font-semibold text-text-primary hover:bg-bg-hover transition-colors focus:outline-none"
                    >
                      <MessageSquare size={14} className="text-accent" />
                      <span>New Message</span>
                    </motion.button>
                  </div>
                )}
              </AnimatePresence>
              
              <motion.button
                onClick={() => setFabOpen(!fabOpen)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-hover text-white flex items-center justify-center shadow-lg focus:outline-none hover:ring-4 hover:ring-accent/20 transition-all duration-200"
              >
                <motion.div
                  animate={{ rotate: fabOpen ? 45 : 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Edit2 size={18} />
                </motion.div>
              </motion.button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};
export default Sidebar;
