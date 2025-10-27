"use client";
import BlocksWaveIcon from '../../BlocksWaveIcon';
import type { CourseWithAvailability, TeeTimeFilters, WaitlistData } from '../../types';
import { hasBookingProvider } from '../../utils';
import { DateNavigation } from '../tee-times/DateNavigation';
import { TeeTimeFilters as TeeTimeFiltersComponent } from '../tee-times/TeeTimeFilters';
import { TeeTimesList } from '../tee-times/TeeTimesList';
import { WaitlistForm } from '../waitlist/WaitlistForm';

type ExpandedCardInlineProps = {
  course: CourseWithAvailability;
  onClose: () => void;
  selectedDate: Date | null;
  onDateChange: (date: Date) => void;
  teeTimeFilters: TeeTimeFilters;
  onTeeTimeFiltersChange: (filters: TeeTimeFilters) => void;
  loadingTeeTimes: boolean;
  teeTimesData: any;
  waitlistData: WaitlistData;
  onWaitlistDataChange: (data: WaitlistData) => void;
  onWaitlistSubmit: () => void;
  waitlistSubmitting: boolean;
  waitlistSuccess: boolean;
  onFetchTeeTimes: (providerId: string, date: string, filters: { patrons: number; holes: number }) => void;
};

export function ExpandedCardInline({
  course,
  onClose,
  selectedDate,
  onDateChange,
  teeTimeFilters,
  onTeeTimeFiltersChange,
  loadingTeeTimes,
  teeTimesData,
  waitlistData,
  onWaitlistDataChange,
  onWaitlistSubmit,
  waitlistSubmitting,
  waitlistSuccess,
  onFetchTeeTimes,
}: ExpandedCardInlineProps) {
  const handleDateChange = (date: Date) => {
    onDateChange(date);
    if (course.provider_id) {
      onFetchTeeTimes(course.provider_id, date.toISOString().split('T')[0], {
        patrons: teeTimeFilters.patrons,
        holes: teeTimeFilters.holes,
      });
    }
  };

  const handleFiltersChange = (filters: TeeTimeFilters) => {
    onTeeTimeFiltersChange(filters);
    if (course.provider_id && selectedDate) {
      onFetchTeeTimes(course.provider_id, selectedDate.toISOString().split('T')[0], {
        patrons: filters.patrons,
        holes: filters.holes,
      });
    }
  };

  return (
    <div className="relative flex gap-2 p-2 items-top">
      {/* Left: Course Image */}
      <div 
        className="relative bg-gradient-to-br from-[var(--color-accent-teal)] to-[var(--color-primary-red)] overflow-hidden rounded-lg flex-shrink-0"
        style={{ width: '100px', height: '100px' }}
      >
        <img
          src={`https://i.postimg.cc/dVhLc1DR/Generated-Image-October-16-2025-3-01-PM.png`}
          alt={course.name}
          className="w-full h-full object-cover"
        />
        {course.verified && (
          <img
            src="https://i.postimg.cc/WbqRWDPb/verfied-badge.png"
            alt="Golf.AI Verified"
            className="absolute top-0 left-1 w-8 h-10 drop-shadow-lg"
          />
        )}
      </div>

      {/* Right: Course Info */}
      <div className="flex-1 flex flex-col min-w-0 justify-center pr-7">
        {/* Close Button - Absolute Top Right */}
        <button
          className="absolute top-2 right-2 bg-white rounded-full p-1 hover:bg-white transition-all group shadow-md hover:shadow-lg"
          style={{ zIndex: 50 }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
        >
          <svg className="w-3.5 h-3.5 text-[var(--color-ink-black)] group-hover:text-[var(--color-primary-red)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Top Row: Name, Location */}
        <div className="flex items-start gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-[var(--color-ink-black)] break-words">
              {course.name}
            </h3>
            <p className="text-xs text-[var(--color-ink-gray)]">
              {course.city}{course.state ? `, ${course.state}` : ""}
            </p>
          </div>
        </div>
        
        {/* No Tee Times Badge - Separate Row */}
        {hasBookingProvider(course.provider) && course.provider_id && teeTimesData?.teetimes && teeTimesData.teetimes.length === 0 && !waitlistSuccess && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 rounded flex-shrink-0 mb-1 w-fit">
            <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-[10px] text-orange-700 whitespace-nowrap">No Tee Times</span>
          </div>
        )}

        {/* Second Row: Tags */}
        <div className="flex gap-1 flex-wrap mb-auto">
          {course.type && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--color-bg-cream)] text-black font-medium capitalize text-[10px]">
              {course.type}
            </span>
          )}
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--color-bg-cream)] text-black font-medium text-[10px]">
            18 holes
          </span>
          {course.verified && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] font-bold text-[10px]">
              VERIFIED
            </span>
          )}
        </div>

        {/* Bottom Row: Button (for no booking) OR Tee Times/Waitlist */}
        {hasBookingProvider(course.provider) && course.provider_id ? (
          /* Tee Times or Waitlist Section for Inline */
          <div className="mt-2 w-full">
            {(loadingTeeTimes || !teeTimesData) ? (
              <div className="flex items-center justify-center py-2 gap-2">
                <BlocksWaveIcon size={16} color="var(--color-primary-red)" />
                <p className="text-[10px] text-[var(--color-ink-gray)]">Loading...</p>
              </div>
            ) : teeTimesData.teetimes && teeTimesData.teetimes.length > 0 ? (
              /* Inline Tee Times - Compact */
              <div className="space-y-1">
                {/* Date selector and filters - compact */}
                <DateNavigation
                  selectedDate={selectedDate}
                  onDateChange={handleDateChange}
                  compact
                />

                {/* Filter options - compact */}
                <TeeTimeFiltersComponent
                  filters={teeTimeFilters}
                  onFiltersChange={handleFiltersChange}
                  compact
                  teeTimesData={teeTimesData}
                />

                {/* Tee times - 2 rows max, horizontally scrollable */}
                <TeeTimesList teetimes={teeTimesData.teetimes} compact />
              </div>
            ) : teeTimesData.teetimes && teeTimesData.teetimes.length === 0 && !waitlistSuccess ? (
              /* Inline Waitlist - Compact */
              <div className="space-y-1.5">
                {/* Date selector - darker text */}
                <DateNavigation
                  selectedDate={selectedDate}
                  onDateChange={handleDateChange}
                  compact
                />
                {/* Compact waitlist form */}
                <WaitlistForm
                  data={waitlistData}
                  onDataChange={onWaitlistDataChange}
                  onSubmit={onWaitlistSubmit}
                  isSubmitting={waitlistSubmitting}
                  compact
                  website={course.website}
                />
              </div>
            ) : null}
          </div>
        ) : (
          /* No booking - just website button */
          <div className="mt-2 w-full">
            {course.website && (
              <button
                className="w-full bg-[var(--color-primary-red)] text-white rounded text-[10px] font-semibold hover:opacity-90 transition cursor-pointer px-2 py-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(course.website!, '_blank');
                }}
              >
                Visit Website
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
