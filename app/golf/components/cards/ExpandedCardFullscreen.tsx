"use client";
import BlocksWaveIcon from '../../BlocksWaveIcon';
import type { CourseWithAvailability, TeeTimeFilters, WaitlistData } from '../../types';
import { hasBookingProvider } from '../../utils';
import { DateNavigation } from '../tee-times/DateNavigation';
import { TeeTimeFilters as TeeTimeFiltersComponent } from '../tee-times/TeeTimeFilters';
import { TeeTimesList } from '../tee-times/TeeTimesList';
import { WaitlistForm } from '../waitlist/WaitlistForm';
import { WaitlistSuccess } from '../waitlist/WaitlistSuccess';

type ExpandedCardFullscreenProps = {
  course: CourseWithAvailability;
  onClose: () => void;
  selectedDate: Date | null;
  onDateChange: (date: Date) => void;
  teeTimeFilters: TeeTimeFilters;
  onTeeTimeFiltersChange: (filters: TeeTimeFilters) => void;
  loadingTeeTimes: boolean;
  teeTimesData: any;
  teeTimesError: any;
  waitlistData: WaitlistData;
  onWaitlistDataChange: (data: WaitlistData) => void;
  onWaitlistSubmit: () => void;
  waitlistSubmitting: boolean;
  waitlistSuccess: boolean;
  onWaitlistSuccessClose: () => void;
  onFetchTeeTimes: (providerId: string, date: string, filters: { patrons: number; holes: number }) => void;
  onBook?: () => void;
};

export function ExpandedCardFullscreen({
  course,
  onClose,
  selectedDate,
  onDateChange,
  teeTimeFilters,
  onTeeTimeFiltersChange,
  loadingTeeTimes,
  teeTimesData,
  teeTimesError,
  waitlistData,
  onWaitlistDataChange,
  onWaitlistSubmit,
  waitlistSubmitting,
  waitlistSuccess,
  onWaitlistSuccessClose,
  onFetchTeeTimes,
  onBook,
}: ExpandedCardFullscreenProps) {
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
    <>
      {/* Course Image */}
      <div 
        className="relative bg-gradient-to-br from-[var(--color-accent-teal)] to-[var(--color-primary-red)] overflow-hidden rounded-t-[16px]"
        style={{ height: '120px' }}
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
            className="absolute top-0 left-2 w-11 h-14 drop-shadow-lg"
          />
        )}
        <button
          className="absolute top-2 right-2 bg-white rounded-full p-1.5 hover:bg-white transition-all group shadow-md hover:shadow-lg"
          style={{ zIndex: 50 }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
        >
          <svg className="w-4 h-4 text-[var(--color-ink-black)] group-hover:text-[var(--color-primary-red)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {typeof course.distance === "number" && (
          <div className={`absolute bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-black font-semibold ${
            course.verified ? 'top-16 left-2' : 'top-2 right-2'
          }`}>
            {course.distance} mi
          </div>
        )}
      </div>

      {/* Course Info */}
      <div className="p-3 text-left">
        {/* Header with No Tee Times message if applicable */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-[var(--color-ink-black)] mb-1 line-clamp-1">
              {course.name}
            </h3>
            <p className="text-[var(--color-ink-gray)] text-xs mb-2">
              {course.city}{course.state ? `, ${course.state}` : ""}
            </p>
          </div>
          
          {/* No Tee Times Badge - Top Right */}
          {hasBookingProvider(course.provider) && course.provider_id && teeTimesData?.teetimes && teeTimesData.teetimes.length === 0 && !waitlistSuccess && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-md">
                <svg className="w-3.5 h-3.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-xs text-orange-700 whitespace-nowrap">No Tee Times</span>
              </div>
              {course.website && (
                <button
                  className="px-2.5 py-1 bg-white border border-gray-300 text-[var(--color-ink-black)] rounded-md text-xs font-medium hover:bg-gray-50 transition whitespace-nowrap"
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

        {/* Tags */}
        <div className="flex gap-1.5 flex-wrap mb-2">
          {course.type && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-bg-cream)] text-black font-medium capitalize text-xs">
              {course.type}
            </span>
          )}
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-bg-cream)] text-black font-medium text-xs">
            18 holes
          </span>
          {course.verified && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] font-bold text-xs">
              VERIFIED
            </span>
          )}
        </div>

        {/* Tee Times Section - Only for TeeBox providers */}
        {hasBookingProvider(course.provider) && course.provider_id && (
          <div className="mt-3">
            {(loadingTeeTimes || !teeTimesData) ? (
              /* Loading State */
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <BlocksWaveIcon size={32} color="var(--color-primary-red)" />
                <p className="text-xs text-[var(--color-ink-gray)] font-medium">
                  Searching Tee Times For {selectedDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ) : teeTimesError ? (
              /* Error State */
              <div className="text-xs text-red-600 py-2">
                Unable to load tee times
              </div>
            ) : teeTimesData.teetimes && teeTimesData.teetimes.length > 0 ? (
              /* Tee Times Display */
              <>
                {/* Filter Bar with Date Navigation */}
                <div className="mb-3 space-y-2">
                  {/* Date Navigation */}
                  <DateNavigation
                    selectedDate={selectedDate}
                    onDateChange={handleDateChange}
                  />

                  {/* Filter Controls */}
                  <TeeTimeFiltersComponent
                    filters={teeTimeFilters}
                    onFiltersChange={handleFiltersChange}
                    teeTimesData={teeTimesData}
                  />
                </div>

                {/* Tee Times Grid - Scrollable */}
                <TeeTimesList teetimes={teeTimesData.teetimes} />
              </>
            ) : teeTimesData.teetimes && teeTimesData.teetimes.length === 0 ? (
              /* No Tee Times Available - Show Date Selector + Message + Waitlist Form */
              waitlistSuccess ? (
                /* Success Message */
                <WaitlistSuccess
                  email={waitlistData.email}
                  onClose={onWaitlistSuccessClose}
                />
              ) : (
                <>
                  {/* Date Navigation - Same as with tee times */}
                  <div className="mb-3">
                    <DateNavigation
                      selectedDate={selectedDate}
                      onDateChange={handleDateChange}
                    />
                  </div>

                  {/* Waitlist Form - Improved Hierarchy */}
                  <WaitlistForm
                    data={waitlistData}
                    onDataChange={onWaitlistDataChange}
                    onSubmit={onWaitlistSubmit}
                    isSubmitting={waitlistSubmitting}
                    website={course.website}
                  />
                </>
              )
            ) : null}
          </div>
        )}

        {/* Action Button - Only show if no TeeBox provider */}
        {!hasBookingProvider(course.provider) && (
          <button
            className="w-full bg-[var(--color-primary-red)] text-white rounded-[8px] font-medium hover:opacity-90 transition cursor-pointer px-3 py-2 text-sm"
            onClick={(e) => {
              e.stopPropagation();
              if (course.website) {
                window.open(course.website, '_blank');
              } else if (onBook) {
                onBook();
              }
            }}
          >
            {course.website ? 'Visit Website' : 'Book Tee Time'}
          </button>
        )}
      </div>
    </>
  );
}
