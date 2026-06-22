import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';

interface DateSeparatorProps {
  date: Date;
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  const getFormattedDate = () => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, d MMMM');
  };

  return (
    <div className="flex justify-center my-3.5 select-none pointer-events-none">
      <div className="px-3.5 py-1 rounded-full bg-bg-bubble-in/40 backdrop-blur-md border border-border-subtle text-text-secondary text-[10px] font-bold shadow-xs">
        {getFormattedDate()}
      </div>
    </div>
  );
};
export default DateSeparator;
