"use client";
import BlocksWaveIcon from '../../BlocksWaveIcon';

export function LoadingState() {
  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-white rounded-[20px] px-6 py-4 shadow-lg text-center">
        <div className="flex items-center gap-3">
          <BlocksWaveIcon size={32} color="var(--color-ink-black)" />
          <p className="text-sm text-[var(--color-ink-gray)] font-medium">
            Gathering Courses...
          </p>
        </div>
      </div>
    </div>
  );
}
