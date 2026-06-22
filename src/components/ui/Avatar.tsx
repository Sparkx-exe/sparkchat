import React from 'react';
import { getAvatarColor, getInitials } from '@/lib/utils/avatarColor';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isOnline = false,
  onClick,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-9 h-9 text-[12px]',
    md: 'w-12 h-12 text-[14px] font-medium',
    lg: 'w-16 h-16 text-[20px] font-semibold',
    xl: 'w-24 h-24 text-[28px] font-semibold',
  };

  const statusDotSize = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5',
  };

  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);

  return (
    <div
      onClick={onClick}
      className={`relative select-none rounded-full flex items-center justify-center text-white shrink-0 overflow-visible ${
        onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
      } ${className}`}
      style={{
        width: sizeClasses[size].split(' ')[0].replace('w-', ''), // fallback widths
        height: sizeClasses[size].split(' ')[1].replace('h-', ''),
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="rounded-full w-full h-full object-cover"
          onError={(e) => {
            // If image fails, clear it to trigger initials fallback
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`w-full h-full rounded-full flex items-center justify-center font-medium ${sizeClasses[size]}`}
          style={{ backgroundColor: bgColor }}
        >
          {initials}
        </div>
      )}

      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 rounded-full bg-success border-2 border-bg-sidebar ${statusDotSize[size]}`}
        />
      )}
    </div>
  );
};
export default Avatar;
