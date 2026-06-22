import React from 'react';

interface SystemMessageProps {
  content: string;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({ content }) => {
  return (
    <div className="flex justify-center my-2 select-none pointer-events-none">
      <div className="px-4 py-1 text-center max-w-[80%] text-[10px] font-medium text-text-system bg-bg-bubble-in/20 backdrop-blur-xs rounded-md border border-border-subtle/50">
        {content}
      </div>
    </div>
  );
};
export default SystemMessage;
