"use client";
import type { TeeTimeFilters as TeeTimeFiltersType } from '../../types';

type TeeTimeFiltersProps = {
  filters: TeeTimeFiltersType;
  onFiltersChange: (filters: TeeTimeFiltersType) => void;
  compact?: boolean;
  teeTimesData?: any;
};

export function TeeTimeFilters({ filters, onFiltersChange, compact = false, teeTimesData }: TeeTimeFiltersProps) {
  const handlePatronsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newPatrons = parseInt(e.target.value);
    onFiltersChange({ ...filters, patrons: newPatrons });
  };

  const handleHolesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newHoles = parseInt(e.target.value);
    onFiltersChange({ ...filters, holes: newHoles });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 mb-1">
        {/* Players dropdown with icon */}
        <div className="relative">
          <select
            value={filters.patrons}
            onChange={handlePatronsChange}
            onClick={(e) => e.stopPropagation()}
            className="pl-5 pr-6 py-1 text-[10px] rounded bg-[var(--color-bg-cream)] text-black cursor-pointer appearance-none font-medium"
          >
            <option value={1}>1 player</option>
            <option value={2}>2 players</option>
            <option value={3}>3 players</option>
            <option value={4}>4 players</option>
          </select>
          <svg className="w-3 h-3 absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <svg className="w-2.5 h-2.5 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Holes dropdown with icon */}
        <div className="relative">
          <select
            value={filters.holes}
            onChange={handleHolesChange}
            onClick={(e) => e.stopPropagation()}
            className="pl-5 pr-6 py-1 text-[10px] rounded bg-[var(--color-bg-cream)] text-black cursor-pointer appearance-none font-medium"
          >
            <option value={9}>9 holes</option>
            <option value={18}>18 holes</option>
          </select>
          <svg className="w-3 h-3 absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
          <svg className="w-2.5 h-2.5 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Price range display with icon */}
        {teeTimesData?.teetimes && teeTimesData.teetimes.length > 0 && (() => {
          const prices = teeTimesData.teetimes
            .map((t: any) => t.pricePerPatron || 0)
            .filter((p: number) => p > 0);
          if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            return (
              <div className="flex items-center gap-0.5 px-1.5 py-1 bg-[var(--color-bg-cream)] rounded">
                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] text-black font-medium">
                  {minPrice === maxPrice ? `$${minPrice}` : 'Variable Pricing'}
                </span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-0.5 px-1.5 py-1 bg-[var(--color-bg-cream)] rounded">
              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px] text-black font-medium">Variable Pricing</span>
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Players Dropdown */}
      <div className="relative flex items-center gap-1 px-2 py-1 bg-[var(--color-bg-cream)] rounded-md">
        <svg className="w-3.5 h-3.5 text-[var(--color-ink-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <select
          className="bg-transparent text-[var(--color-ink-black)] font-medium outline-none cursor-pointer appearance-none pr-4"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")',
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.25rem'
          }}
          value={filters.patrons}
          onChange={handlePatronsChange}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="1">1 player</option>
          <option value="2">2 players</option>
          <option value="3">3 players</option>
          <option value="4">4 players</option>
        </select>
      </div>

      {/* Holes Dropdown */}
      <div className="relative flex items-center gap-1 px-2 py-1 bg-[var(--color-bg-cream)] rounded-md">
        <svg className="w-3.5 h-3.5 text-[var(--color-ink-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
        <select
          className="bg-transparent text-[var(--color-ink-black)] font-medium outline-none cursor-pointer appearance-none pr-4"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")',
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.25rem'
          }}
          value={filters.holes}
          onChange={handleHolesChange}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="9">9 holes</option>
          <option value="18">18 holes</option>
        </select>
      </div>

      {/* Price Range Display */}
      {teeTimesData?.teetimes && teeTimesData.teetimes.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-[var(--color-bg-cream)] rounded-md text-[var(--color-ink-gray)]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-[var(--color-ink-black)]">
            {(() => {
              const minPrice = Math.min(...teeTimesData.teetimes.map((t: any) => t.pricePerPatron / 100));
              const maxPrice = Math.max(...teeTimesData.teetimes.map((t: any) => t.pricePerPatron / 100));
              
              if (minPrice === 0 && maxPrice === 0) {
                return 'Variable Pricing';
              } else if (minPrice === 0) {
                return `Up to $${maxPrice} per player`;
              } else {
                return `$${minPrice} - $${maxPrice} per player`;
              }
            })()}
          </span>
        </div>
      )}
    </div>
  );
}
