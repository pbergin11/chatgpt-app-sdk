"use client";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import type { WaitlistData } from '../../types';

type WaitlistFormProps = {
  data: WaitlistData;
  onDataChange: (data: WaitlistData) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  compact?: boolean;
  website?: string | null;
};

export function WaitlistForm({ data, onDataChange, onSubmit, isSubmitting, compact = false, website }: WaitlistFormProps) {
  if (compact) {
    return (
      <div className="space-y-1">
        <p className="text-[9px] text-[var(--color-ink-gray)]">Join waitlist to get notified</p>
        {/* Name and Email row */}
        <div className="grid grid-cols-2 gap-1">
          <input
            type="text"
            value={data.name}
            onChange={(e) => onDataChange({ ...data, name: e.target.value })}
            className="px-1.5 py-1 text-[10px] border border-gray-300 rounded text-gray-800"
            placeholder="Name"
            onClick={(e) => e.stopPropagation()}
          />
          <input
            type="email"
            value={data.email}
            onChange={(e) => onDataChange({ ...data, email: e.target.value })}
            className="px-1.5 py-1 text-[10px] border border-gray-300 rounded text-gray-800"
            placeholder="Email"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        {/* Phone and Time Range on same line */}
        <div className="grid grid-cols-2 gap-1">
          {/* Phone */}
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => onDataChange({ ...data, phone: e.target.value })}
            className="px-1.5 py-1 text-[10px] border border-gray-300 rounded text-gray-800"
            placeholder="Phone (optional)"
            onClick={(e) => e.stopPropagation()}
          />
          {/* Time Range */}
          <div className="flex items-center gap-1">
            <input
              type="time"
              value={data.timeStart}
              onChange={(e) => onDataChange({ ...data, timeStart: e.target.value })}
              className="flex-1 px-1 py-1 text-[10px] border border-gray-300 rounded text-gray-800"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-[8px] text-[var(--color-ink-gray)]">to</span>
            <input
              type="time"
              value={data.timeEnd}
              onChange={(e) => onDataChange({ ...data, timeEnd: e.target.value })}
              className="flex-1 px-1 py-1 text-[10px] border border-gray-300 rounded text-gray-800"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        {/* Buttons row */}
        <div className="grid grid-cols-2 gap-1">
          <button
            className="px-2 py-1 bg-[var(--color-primary-red)] text-white rounded text-[10px] font-semibold hover:opacity-90 transition"
            onClick={(e) => {
              e.stopPropagation();
              onSubmit();
            }}
            disabled={!data.email || isSubmitting}
          >
            {isSubmitting ? 'Joining...' : 'Join Waitlist'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-3 border-t border-gray-200">
      <div>
        <h3 className="text-sm font-bold text-[var(--color-ink-black)] mb-1">Join Waitlist</h3>
        <p className="text-xs text-[var(--color-ink-gray)]">Change the date or join the waitlist to get notified</p>
      </div>

      {/* Name and Email on same line */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-[var(--color-ink-gray)] mb-1">Name</label>
          <input
            type="text"
            value={data.name}
            disabled
            className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded text-[var(--color-ink-gray)] cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-ink-gray)] mb-1">Email</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onDataChange({ ...data, email: e.target.value })}
            className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-red)] focus:border-transparent placeholder:text-gray-500"
            placeholder="your@email.com"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {/* Phone and Time Range on same line */}
      <div className="grid grid-cols-2 gap-2">
        {/* Phone */}
        <div>
          <label className="block text-xs font-medium text-[var(--color-ink-gray)] mb-1">
            Phone <span className="text-[var(--color-ink-gray)] font-normal">(optional)</span>
          </label>
          <PhoneInput
            international
            defaultCountry="US"
            value={data.phone}
            onChange={(value) => onDataChange({ ...data, phone: value || '' })}
            className="w-full"
            style={{
              '--PhoneInputCountryFlag-borderColor': 'transparent',
            } as any}
            inputComponent={(props: any) => (
              <input
                {...props}
                className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-red)] focus:border-transparent placeholder:text-gray-500"
                onClick={(e: any) => e.stopPropagation()}
              />
            )}
          />
        </div>

        {/* Time Range */}
        <div>
          <label className="block text-xs font-medium text-[var(--color-ink-gray)] mb-1">Preferred Time Range</label>
          <div className="flex items-center gap-1.5">
            <input
              type="time"
              value={data.timeStart}
              onChange={(e) => onDataChange({ ...data, timeStart: e.target.value })}
              className="flex-1 px-2 py-2 text-xs border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-red)] focus:border-transparent"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-[var(--color-ink-gray)] text-[10px] font-medium">to</span>
            <input
              type="time"
              value={data.timeEnd}
              onChange={(e) => onDataChange({ ...data, timeEnd: e.target.value })}
              className="flex-1 px-2 py-2 text-xs border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-red)] focus:border-transparent"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>

      {/* Submit Button - Prominent */}
      <button
        className="w-full px-4 py-2.5 bg-[var(--color-primary-red)] text-white rounded-lg text-sm font-bold hover:opacity-90 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={(e) => {
          e.stopPropagation();
          onSubmit();
        }}
        disabled={isSubmitting || !data.email}
      >
        {isSubmitting ? 'Joining...' : 'Join Waitlist'}
      </button>
    </div>
  );
}
