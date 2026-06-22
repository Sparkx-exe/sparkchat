import React from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import UserInfoPanel from './UserInfoPanel';
import GroupInfoPanel from './GroupInfoPanel';

export const RightPanelWrapper: React.FC = () => {
  const { rightPanelOpen, rightPanelType } = useUIStore();

  if (!rightPanelOpen || !rightPanelType) return null;

  return (
    <motion.aside
      initial={{ x: 360, opacity: 0.8 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0.8 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="w-full md:w-[360px] bg-bg-sidebar border-l border-divider h-full shrink-0 z-10 flex flex-col overflow-hidden relative"
    >
      {rightPanelType === 'user_info' ? <UserInfoPanel /> : <GroupInfoPanel />}
    </motion.aside>
  );
};
export default RightPanelWrapper;
