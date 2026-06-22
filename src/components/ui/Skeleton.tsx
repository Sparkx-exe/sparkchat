import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
}) => {
  const variantClasses = {
    text: 'h-4 w-3/4 rounded-sm',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div
      className={`animate-pulse bg-bg-skeleton ${variantClasses[variant]} ${className}`}
    />
  );
};
export default Skeleton;
