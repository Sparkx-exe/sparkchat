import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export const ChatListSkeleton: React.FC = () => {
  return (
    <div className="w-full h-full p-2 space-y-3.5 select-none overflow-hidden bg-bg-sidebar">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3.5 px-3 py-1">
          {/* Avatar Skeleton */}
          <Skeleton variant="circular" className="w-11 h-11 shrink-0" />
          
          {/* Details Skeletons */}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex justify-between items-center">
              <Skeleton variant="text" className="w-24 h-3.5" />
              <Skeleton variant="text" className="w-10 h-3" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton variant="text" className="w-36 h-3" />
              <Skeleton variant="circular" className="w-4 h-4 shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
export default ChatListSkeleton;
