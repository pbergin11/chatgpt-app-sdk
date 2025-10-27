"use client";
import { useRef, useEffect } from 'react';
import type { CourseWithAvailability, TeeTimeFilters, WaitlistData } from '../../types';
import { hasBookingProvider } from '../../utils';
import { CompactCard } from './CompactCard';
import { ExpandedCardInline } from './ExpandedCardInline';
import { ExpandedCardFullscreen } from './ExpandedCardFullscreen';

type CourseCardProps = {
  course: CourseWithAvailability;
  isSelected: boolean;
  dimForNoAvail: boolean;
  displayMode: 'inline' | 'fullscreen';
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
  onSelectCourse: (id: string) => void;
  onFetchTeeTimes: (providerId: string, date: string, filters: { patrons: number; holes: number }) => void;
  onBook?: () => void;
  onCardHover?: (courseId: string, isHovering: boolean) => void;
  cardRef?: (el: HTMLButtonElement | null) => void;
};

export function CourseCard({
  course,
  isSelected,
  dimForNoAvail,
  displayMode,
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
  onSelectCourse,
  onFetchTeeTimes,
  onBook,
  onCardHover,
  cardRef,
}: CourseCardProps) {
  // Calculate width based on whether this specific card has TeeBox provider
  const cardWidth = isSelected 
    ? (hasBookingProvider(course.provider) && course.provider_id 
        ? (displayMode === 'inline' ? 600 : 600) 
        : (displayMode === 'inline' ? 280 : 320))
    : 280;

  return (
    <div
      ref={cardRef as any}
      className={`bg-white rounded-[16px] shadow-[var(--shadow-card)] transition-all duration-200 flex-shrink-0 ${
        isSelected 
          ? "" 
          : "cursor-pointer hover:shadow-lg"
      } ${
        isSelected 
          ? "" 
          : "hover:translate-y-[-2px]"
      } ${dimForNoAvail ? "opacity-100" : ""}`}
      style={{ 
        width: `${cardWidth}px`,
        transformOrigin: 'bottom center',
        pointerEvents: 'auto'
      }}
      onClick={() => !isSelected && onSelectCourse(course.id)}
      onMouseEnter={() => onCardHover?.(course.id, true)}
      onMouseLeave={() => onCardHover?.(course.id, false)}
    >
      {/* Compact Layout (Not Selected) */}
      {!isSelected ? (
        <CompactCard course={course} onClick={() => onSelectCourse(course.id)} />
      ) : (
        /* Expanded Layout (Selected) */
        <>
          {displayMode === 'inline' ? (
            /* INLINE COMPACT LAYOUT */
            <ExpandedCardInline
              course={course}
              onClose={() => onSelectCourse(course.id)}
              selectedDate={selectedDate}
              onDateChange={onDateChange}
              teeTimeFilters={teeTimeFilters}
              onTeeTimeFiltersChange={onTeeTimeFiltersChange}
              loadingTeeTimes={loadingTeeTimes}
              teeTimesData={teeTimesData}
              waitlistData={waitlistData}
              onWaitlistDataChange={onWaitlistDataChange}
              onWaitlistSubmit={onWaitlistSubmit}
              waitlistSubmitting={waitlistSubmitting}
              waitlistSuccess={waitlistSuccess}
              onFetchTeeTimes={onFetchTeeTimes}
            />
          ) : (
            /* FULLSCREEN LAYOUT */
            <ExpandedCardFullscreen
              course={course}
              onClose={() => onSelectCourse(course.id)}
              selectedDate={selectedDate}
              onDateChange={onDateChange}
              teeTimeFilters={teeTimeFilters}
              onTeeTimeFiltersChange={onTeeTimeFiltersChange}
              loadingTeeTimes={loadingTeeTimes}
              teeTimesData={teeTimesData}
              teeTimesError={teeTimesError}
              waitlistData={waitlistData}
              onWaitlistDataChange={onWaitlistDataChange}
              onWaitlistSubmit={onWaitlistSubmit}
              waitlistSubmitting={waitlistSubmitting}
              waitlistSuccess={waitlistSuccess}
              onWaitlistSuccessClose={onWaitlistSuccessClose}
              onFetchTeeTimes={onFetchTeeTimes}
              onBook={onBook}
            />
          )}
        </>
      )}
    </div>
  );
}
