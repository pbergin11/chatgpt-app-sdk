"use client";

type LegendProps = {
  showLegend: boolean;
};

export function Legend({ showLegend }: LegendProps) {
  return (
    <div 
      className={`bg-white/95 backdrop-blur-sm rounded-lg border border-[var(--color-ui-line)] shadow-lg overflow-hidden transition-all duration-300 ease-out ${
        showLegend ? 'max-w-[250px] opacity-100' : 'max-w-0 opacity-0'
      }`}
      style={{ height: '42px' }}
    >
      <div className="flex items-center gap-3 px-3 h-full whitespace-nowrap">
        <div className="text-[14px] font-bold text-[var(--color-ink-black)]">Availability</div>
        <div className="flex-1 min-w-[100px]">
          {/* Color gradient bar */}
          <div className="h-2 rounded-full mb-1" style={{
            background: 'linear-gradient(to right, #FF0D0D, #FF4E11, #FF8E15, #FAB733, #ACB334, #69B34C)'
          }}></div>
          {/* Labels */}
          <div className="flex justify-between text-[9px] text-[var(--color-ink-gray)]">
            <span>Booked</span>
            <span>Available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
