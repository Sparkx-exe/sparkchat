import React from 'react';

interface BadgeProps {
  content: string | number;
  variant?: 'accent' | 'muted' | 'danger';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  content,
  variant = 'accent',
  className = '',
}) => {
  const baseClasses =
    'inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] h-[18px]';
  
  const variantClasses = {
    accent: 'bg-accent text-white',
    muted: 'bg-bg-active text-text-secondary',
    danger: 'bg-danger text-white',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {content}
    </span>
  );
};
export default Badge;
