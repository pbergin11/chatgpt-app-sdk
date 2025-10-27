"use client";
import type { TeeTime } from '../../../api/teefox/route';

type TeeTimesListProps = {
  teetimes: TeeTime[];
  compact?: boolean;
};

export function TeeTimesList({ teetimes, compact = false }: TeeTimesListProps) {
  const handleBooking = (e: React.MouseEvent, teeTime: TeeTime) => {
    e.stopPropagation();
    if (teeTime.bookingUrl) {
      const url = teeTime.bookingUrl.startsWith('http') 
        ? teeTime.bookingUrl 
        : `https://${teeTime.bookingUrl}`;
      window.open(url, '_blank');
    }
  };

  if (compact) {
    return (
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="grid grid-flow-col auto-cols-max gap-1 pb-1" style={{ gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}>
          {teetimes.map((teeTime, idx) => {
            // Parse the time in the course's timezone
            const time = new Date(teeTime.apptTime);
            const timeStr = time.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true,
              timeZone: teeTime.timezone // Use the course's timezone
            });
            // Format price for tooltip
            const priceStr = teeTime.pricePerPatron 
              ? `$${(teeTime.pricePerPatron / 100).toFixed(2)} per person`
              : 'Price not available';
            return (
              <button
                key={idx}
                className="px-2 py-1 bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[var(--color-ink-black)] rounded text-[10px] font-medium transition whitespace-nowrap"
                title={priceStr}
                onClick={(e) => handleBooking(e, teeTime)}
              >
                {timeStr}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto pr-1 pb-2"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#CBD5E0 transparent'
      }}
    >
      {teetimes.map((teeTime, idx) => {
        // Parse the time in the course's timezone
        const time = new Date(teeTime.apptTime);
        const timeStr = time.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true,
          timeZone: teeTime.timezone // Use the course's timezone
        });
        // Format price for tooltip
        const priceStr = teeTime.pricePerPatron 
          ? `$${(teeTime.pricePerPatron / 100).toFixed(2)} per person`
          : 'Price not available';
        return (
          <button
            key={idx}
            className="px-2 py-1.5 bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[var(--color-ink-black)] rounded-md text-xs font-medium transition-colors cursor-pointer"
            title={priceStr}
            onClick={(e) => handleBooking(e, teeTime)}
          >
            {timeStr}
          </button>
        );
      })}
    </div>
  );
}
