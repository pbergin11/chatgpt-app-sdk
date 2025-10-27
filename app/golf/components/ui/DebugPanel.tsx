"use client";
import type { CourseWithAvailability, GolfWidgetState } from '../../types';
import { getMarkerColor } from '../../utils';

type DebugPanelProps = {
  showDebugInfo: boolean;
  hasOpenAI: boolean;
  displayMode: 'inline' | 'fullscreen';
  maxHeight?: number;
  safeArea: any;
  theme: string | null;
  locale: string | null;
  userAgent: any;
  toolInput: any;
  toolOutputFromHook: any;
  toolResponseMetadata: any;
  state: GolfWidgetState | null;
  coursesCount: number;
  selectedCourse: CourseWithAvailability | null;
  localDisplayMode: 'inline' | 'fullscreen';
  setLocalDisplayMode: (mode: 'inline' | 'fullscreen') => void;
};

export function DebugPanel({
  showDebugInfo,
  hasOpenAI,
  displayMode,
  maxHeight,
  safeArea,
  theme,
  locale,
  userAgent,
  toolInput,
  toolOutputFromHook,
  toolResponseMetadata,
  state,
  coursesCount,
  selectedCourse,
  localDisplayMode,
  setLocalDisplayMode,
}: DebugPanelProps) {
  if (!showDebugInfo) return null;

  return (
    <div className="absolute top-16 right-4 z-10 w-[280px] pointer-events-none">
      <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-[var(--color-ui-line)] shadow-lg pointer-events-auto">
        {/* Debug Info */}
        <div className="px-3 py-2 text-xs text-black font-mono max-h-[70vh] overflow-y-auto">
          <div className="font-bold mb-2 text-[var(--color-primary-red)] text-sm">SDK Debug Info</div>
        
        {/* Connection Status */}
        <div className="mb-2 pb-2 border-b border-gray-200">
          <div className="font-semibold text-[var(--color-accent-teal)] mb-1">Connection</div>
          <div><span className="text-[var(--color-ink-gray)]">window.openai:</span> <span className="font-semibold">{hasOpenAI ? '✓ exists' : '✗ missing'}</span></div>
        </div>
        
        {/* Layout Properties */}
        <div className="mb-2 pb-2 border-b border-gray-200">
          <div className="font-semibold text-[var(--color-accent-teal)] mb-1">Layout</div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--color-ink-gray)]">displayMode:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{displayMode ?? 'undefined'}</span>
              {!hasOpenAI && (
                <button
                  onClick={() => setLocalDisplayMode(localDisplayMode === 'inline' ? 'fullscreen' : 'inline')}
                  className="px-2 py-0.5 bg-[var(--color-primary-red)] text-white rounded text-[10px] font-semibold hover:opacity-90 transition"
                >
                  Toggle
                </button>
              )}
            </div>
          </div>
          <div><span className="text-[var(--color-ink-gray)]">maxHeight:</span> <span className="font-semibold">{maxHeight ?? 'undefined'}{maxHeight ? 'px' : ''}</span></div>
          <div><span className="text-[var(--color-ink-gray)]">safeArea.top:</span> <span className="font-semibold">{safeArea?.insets?.top ?? 'N/A'}</span></div>
          <div><span className="text-[var(--color-ink-gray)]">safeArea.bottom:</span> <span className="font-semibold">{safeArea?.insets?.bottom ?? 'N/A'}</span></div>
          <div><span className="text-[var(--color-ink-gray)]">safeArea.left:</span> <span className="font-semibold">{safeArea?.insets?.left ?? 'N/A'}</span></div>
          <div><span className="text-[var(--color-ink-gray)]">safeArea.right:</span> <span className="font-semibold">{safeArea?.insets?.right ?? 'N/A'}</span></div>
        </div>
        
        {/* Visual Properties */}
        <div className="mb-2 pb-2 border-b border-gray-200">
          <div className="font-semibold text-[var(--color-accent-teal)] mb-1">Visuals</div>
          <div><span className="text-[var(--color-ink-gray)]">theme:</span> <span className="font-semibold">{theme ?? 'N/A'}</span></div>
          <div><span className="text-[var(--color-ink-gray)]">locale:</span> <span className="font-semibold">{locale ?? 'N/A'}</span></div>
        </div>
        
        {/* Device Properties */}
        <div className="mb-2 pb-2 border-b border-gray-200">
          <div className="font-semibold text-[var(--color-accent-teal)] mb-1">Device</div>
          <div><span className="text-[var(--color-ink-gray)]">type:</span> <span className="font-semibold">{userAgent?.device?.type ?? 'N/A'}</span></div>
          <div><span className="text-[var(--color-ink-gray)]">hover:</span> <span className="font-semibold">{userAgent?.capabilities?.hover ? '✓' : '✗'}</span></div>
          <div><span className="text-[var(--color-ink-gray)]">touch:</span> <span className="font-semibold">{userAgent?.capabilities?.touch ? '✓' : '✗'}</span></div>
        </div>
        
        {/* State Properties */}
        <div className="mb-2 pb-2 border-b border-gray-200">
          <div className="font-semibold text-[var(--color-accent-teal)] mb-1">State</div>
          <div><span className="text-[var(--color-ink-gray)]">toolInput:</span> <span className="font-semibold">{toolInput ? '✓ present' : '✗ null'}</span></div>
          <div><span className="text-[var(--color-ink-gray)]">toolOutput:</span> <span className="font-semibold">{toolOutputFromHook ? '✓ present' : '✗ null'}</span></div>
          <div><span className="text-[var(--color-ink-gray)]">metadata:</span> <span className="font-semibold">{toolResponseMetadata ? '✓ present' : '✗ null'}</span></div>
          <div><span className="text-[var(--color-ink-gray)]">widgetState:</span> <span className="font-semibold">{state ? '✓ present' : '✗ null'}</span></div>
        </div>
        
        {/* Data Summary */}
        <div>
          <div className="font-semibold text-[var(--color-accent-teal)] mb-1">Data</div>
          <div><span className="text-[var(--color-ink-gray)]">courses:</span> <span className="font-semibold">{coursesCount}</span></div>
          <div><span className="text-[var(--color-ink-gray)]">selectedCourse:</span> <span className="font-semibold">{state?.selectedCourseId ?? 'none'}</span></div>
          <div><span className="text-[var(--color-ink-gray)]">viewport.zoom:</span> <span className="font-semibold">{state?.viewport?.zoom?.toFixed(2) ?? 'N/A'}</span></div>
          <div><span className="text-[var(--color-ink-gray)]">selectedCourseColor:</span> <span className="font-semibold">{selectedCourse ? getMarkerColor(selectedCourse as any) : 'N/A'}</span></div>
        </div>
        </div>
      </div>
    </div>
  );
}
