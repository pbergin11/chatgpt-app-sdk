"use client";

type DateNavigationProps = {
  selectedDate: Date | null;
  onDateChange: (date: Date) => void;
  compact?: boolean;
};

export function DateNavigation({ selectedDate, onDateChange, compact = false }: DateNavigationProps) {
  const handlePrevDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      
      if (selected > today) {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() - 1);
        onDateChange(newDate);
      }
    }
  };

  const handleNextDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + 1);
      onDateChange(newDate);
    }
  };

  const isToday = selectedDate && selectedDate.toDateString() === new Date().toDateString();

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-1 mb-1">
        <button
          className="p-0.5 hover:bg-gray-100 rounded transition disabled:opacity-30"
          disabled={!!isToday}
          onClick={handlePrevDay}
        >
          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-[10px] font-semibold text-black">
          {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <button
          className="p-0.5 hover:bg-gray-100 rounded transition"
          onClick={handleNextDay}
        >
          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        className="p-1 hover:bg-gray-100 rounded transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        disabled={!!isToday}
        onClick={handlePrevDay}
      >
        <svg className="w-4 h-4 text-[var(--color-ink-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-sm font-semibold text-[var(--color-ink-black)]">
        {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </span>
      <button
        className="p-1 hover:bg-gray-100 rounded transition"
        onClick={handleNextDay}
      >
        <svg className="w-4 h-4 text-[var(--color-ink-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
