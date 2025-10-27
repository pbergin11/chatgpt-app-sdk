"use client";
import type { CourseWithAvailability } from '../../types';
import { hasBookingProvider } from '../../utils';

type CompactCardProps = {
  course: CourseWithAvailability;
  onClick: () => void;
};

export function CompactCard({ course, onClick }: CompactCardProps) {
  return (
    <div className="relative flex items-center gap-3 p-3 cursor-pointer" onClick={onClick}>
      {/* Verified Badge - Top Left of Card */}
      {course.verified && (
        <img
          src="https://i.postimg.cc/WbqRWDPb/verfied-badge.png"
          alt="Golf.AI Verified"
          className="absolute top-0 left-3 w-6 h-8 drop-shadow-lg z-10"
        />
      )}
      
      {/* Course Image */}
      <div 
        className="relative bg-gradient-to-br from-[var(--color-accent-teal)] to-[var(--color-primary-red)] overflow-hidden rounded-[12px] flex-shrink-0"
        style={{ width: '80px', height: '80px' }}
      >
        <img
          src={`https://i.postimg.cc/dVhLc1DR/Generated-Image-October-16-2025-3-01-PM.png`}
          alt={course.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Course Info */}
      <div className="flex-1 text-left min-w-0">
        <h3 className="font-bold text-[var(--color-ink-black)] text-sm mb-1 line-clamp-1">
          {course.name}
        </h3>
        <p className="text-[var(--color-ink-gray)] text-xs mb-2 line-clamp-1">
          {course.city}{course.state ? `, ${course.state}` : ""}
        </p>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {typeof course.distance === "number" && (
            <span className="text-[var(--color-ink-gray)]">
              {course.distance} mi
            </span>
          )}
          {course.type && (
            <span className="px-2 py-0.5 rounded-md bg-[var(--color-bg-cream)] text-black font-medium text-xs capitalize">{course.type}</span>
          )}
          {/* Book Now tag for TeeBox courses */}
          {hasBookingProvider(course.provider) && course.provider_id && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-primary-red)] text-white font-semibold text-[10px]">
              BOOK NOW
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
