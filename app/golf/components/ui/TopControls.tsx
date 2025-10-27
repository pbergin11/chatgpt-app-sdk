"use client";

type TopControlsProps = {
  displayMode: 'inline' | 'fullscreen';
  onToggleDisplayMode: () => void;
  onToggleDebug: () => void;
};

export function TopControls({ displayMode, onToggleDisplayMode, onToggleDebug }: TopControlsProps) {
  return (
    <div className="absolute top-4 right-4 z-10 flex gap-2 items-start pointer-events-none">
      {/* Expand/Contract Button */}
      <button
        className="bg-white/95 backdrop-blur-sm rounded-lg border border-[var(--color-ui-line)] shadow-lg p-2.5 hover:bg-white transition-all pointer-events-auto group"
        onClick={onToggleDisplayMode}
        aria-label={displayMode === "fullscreen" ? "Exit fullscreen" : "Enter fullscreen"}
        title={displayMode === "fullscreen" ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {displayMode === "fullscreen" ? (
          // Contract icon (minimize)
          <svg className="w-5 h-5 text-[var(--color-ink-black)] group-hover:text-[var(--color-primary-red)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
        ) : (
          // Expand icon (maximize)
          <svg className="w-5 h-5 text-[var(--color-ink-black)] group-hover:text-[var(--color-primary-red)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        )}
      </button>

      {/* Info Button */}
      <button
        className="bg-white/95 backdrop-blur-sm rounded-lg border border-[var(--color-ui-line)] shadow-lg p-2.5 hover:bg-white transition-all pointer-events-auto group"
        onClick={onToggleDebug}
        aria-label="Toggle debug info"
        title="Toggle debug info"
      >
        <svg className="w-5 h-5 text-[var(--color-ink-black)] group-hover:text-[var(--color-accent-teal)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  );
}
