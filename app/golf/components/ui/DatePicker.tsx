"use client";
import { useState, useEffect } from 'react';

type DatePickerProps = {
  selectedDate: Date | null;
  onDateChange: (date: Date) => void;
  displayMode: 'inline' | 'fullscreen';
};

export function DatePicker({ selectedDate, onDateChange, displayMode }: DatePickerProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDatePicker && !target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-[var(--color-ui-line)] shadow-lg flex items-center justify-center">
      <div className="relative">
        <button
          className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-[var(--color-ink-black)] hover:bg-gray-50 rounded-lg transition-colors w-full"
          onClick={() => setShowDatePicker(!showDatePicker)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select Date'}</span>
        </button>
        
        {/* Simple Date Picker Dropdown */}
        {showDatePicker && (
          <div 
            className="absolute top-full left-0 mt-2 bg-white rounded-lg border border-[var(--color-ui-line)] shadow-xl min-w-[200px]"
            style={{ 
              maxHeight: displayMode === 'inline' ? '200px' : '300px',
              overflowY: 'auto'
            }}
          >
            <div className="p-2 space-y-1">
              {/* Next 14 days */}
              {Array.from({ length: 14 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i);
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                return (
                  <button
                    key={i}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      isSelected 
                        ? 'bg-[var(--color-primary-red)] text-white' 
                        : 'hover:bg-gray-100 text-[var(--color-ink-black)]'
                    }`}
                    onClick={() => {
                      onDateChange(date);
                      setShowDatePicker(false);
                    }}
                  >
                    <div className="text-sm">
                      {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'long' })}
                    </div>
                    <div className="text-xs opacity-75">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
