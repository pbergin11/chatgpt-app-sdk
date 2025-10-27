"use client";

type WaitlistSuccessProps = {
  email: string;
  onClose: () => void;
};

export function WaitlistSuccess({ email, onClose }: WaitlistSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-[var(--color-ink-black)] mb-2">
          You're on the Waitlist!
        </p>
        <p className="text-sm text-[var(--color-ink-gray)] max-w-xs">
          We'll notify you at <span className="font-medium text-[var(--color-ink-black)]">{email}</span> when a tee time becomes available.
        </p>
      </div>
      <button
        className="px-4 py-2 text-sm font-medium text-[var(--color-primary-red)] hover:bg-red-50 rounded-lg transition"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        Close
      </button>
    </div>
  );
}
