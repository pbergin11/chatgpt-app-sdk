"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  useWidgetProps,
  useWidgetState,
  useDisplayMode,
  useMaxHeight,
  useRequestDisplayMode,
  useCallTool,
  useUserAgent,
  useTheme,
  useLocale,
  useSafeArea,
  useToolInput,
  useToolOutput,
  useToolResponseMetadata,
} from "../hooks";
import { getCoursesNearSanDiego } from "../actions/getCourses";
import { useTeeTimes } from "../hooks";
import type { CoursePoint, CourseWithAvailability, GolfWidgetState, TeeTimeFilters, WaitlistData } from './types';
import { MapContainer } from './components/map/MapContainer';
import { MapMarkers } from './components/map/MapMarkers';
import { MapFitBounds } from './components/map/MapFitBounds';
import { DatePicker } from './components/ui/DatePicker';
import { Legend } from './components/ui/Legend';
import { TopControls } from './components/ui/TopControls';
import { DebugPanel } from './components/ui/DebugPanel';
import { LoadingState } from './components/ui/LoadingState';
import { CourseCard } from './components/cards/CourseCard';

export default function GolfPage() {
  const toolOutputRaw = useWidgetProps<{
    courses?: CoursePoint[];
    course?: { id: string; name: string; description?: string };
    searchContext?: { matched_date?: string | null };
  }>();

  // Detect ChatGPT iframe environment early so we avoid cross-origin Server Actions
  const hasOpenAI = typeof window !== 'undefined' && !!(window as any).openai;

  // State for local development data
  const [localCourses, setLocalCourses] = useState<CoursePoint[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);

  // For local debugging: Load San Diego courses from Supabase if no tool output
  useEffect(() => {
    // Only load local data for localhost development (not inside ChatGPT iframe)
    if (!hasOpenAI && !toolOutputRaw?.courses && !toolOutputRaw?.course && localCourses.length === 0 && !isLoadingLocal) {
      setIsLoadingLocal(true);
      getCoursesNearSanDiego()
        .then((courses: any[]) => {
          console.log(courses);
          setLocalCourses(courses as CoursePoint[]);
        })
        .catch((error: any) => {
          console.error('Failed to load local courses:', error);
        })
        .finally(() => {
          setIsLoadingLocal(false);
        });
    }
  }, [hasOpenAI, toolOutputRaw, localCourses.length, isLoadingLocal]);

  const toolOutput = useMemo(() => {
    if (toolOutputRaw?.courses || toolOutputRaw?.course) {
      return toolOutputRaw;
    }
    // Return real San Diego courses from Supabase for local development
    return {
      courses: localCourses,
    };
  }, [toolOutputRaw, localCourses]);

  const [state, setState] = useWidgetState<GolfWidgetState>(() => ({
    __v: 1,
    viewport: { center: [-117.1611, 32.7157], zoom: 10 }, // default San Diego
  }));
  const displayModeFromSDK = useDisplayMode();
  const rawMaxHeight = useMaxHeight() ?? undefined;
  const requestDisplayMode = useRequestDisplayMode();
  const callTool = useCallTool();
  const userAgent = useUserAgent();
  
  // Local display mode override for localhost testing
  const [localDisplayMode, setLocalDisplayMode] = useState<'inline' | 'fullscreen'>('inline');
  // Filter displayMode to only 'inline' or 'fullscreen' (exclude 'pip' mode)
  const displayMode: 'inline' | 'fullscreen' = hasOpenAI 
    ? (displayModeFromSDK === 'fullscreen' ? 'fullscreen' : 'inline')
    : localDisplayMode;
  
  // Cap maxHeight at 750px for inline mode (both mobile and desktop) to prevent infinite growth
  const maxHeight = useMemo(() => {
    if (displayMode === 'inline' && rawMaxHeight) {
      return Math.min(rawMaxHeight, 750);
    }
    return rawMaxHeight;
  }, [rawMaxHeight, displayMode]);
  const theme = useTheme();
  const locale = useLocale();
  const safeArea = useSafeArea();
  const toolInput = useToolInput();
  const toolOutputFromHook = useToolOutput();
  const toolResponseMetadata = useToolResponseMetadata();

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const [noToken, setNoToken] = useState(false);
  const [noWebGL, setNoWebGL] = useState(false);
  const [workerReady, setWorkerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showLegend, setShowLegend] = useState(false);
  
  useEffect(() => {
    setWorkerReady(true);
  }, []);

  // Tee times state
  const { loading: loadingTeeTimes, error: teeTimesError, data: teeTimesData, fetchTeeTimes } = useTeeTimes();
  console.log('teetimesdata', teeTimesData)
  
  // Tee times filters
  const [teeTimeFilters, setTeeTimeFilters] = useState<TeeTimeFilters>({
    patrons: 4,
    holes: 18,
    minPrice: 0,
    maxPrice: 200,
  });
  
  // Waitlist form state
  const [waitlistData, setWaitlistData] = useState<WaitlistData>({
    name: 'Peter Bergin',
    email: 'peter@golf.ai',
    phone: '',
    timeStart: '08:00',
    timeEnd: '18:00',
  });
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const courseCardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Calculate availability for each course
  const coursesWithAvailability = useMemo(() => {
    // Use selected date from date picker, or fall back to search context date
    const dateToUse = selectedDate 
      ? selectedDate.toISOString().split('T')[0] 
      : (toolOutput?.searchContext?.matched_date ?? undefined);
    
    // Handle both search_courses (returns courses array) and get_course_details (returns single course)
    const coursesArray = toolOutput?.courses 
      ? toolOutput.courses 
      : toolOutput?.course 
        ? [toolOutput.course] 
        : [];
    
    return coursesArray
      .filter((c: any) => typeof c.lon === "number" && typeof c.lat === "number")
      .map((c: any) => {
        const totalAvailable = c.availability?.reduce((sum: number, day: any) =>
          sum + day.tee_times.filter((slot: any) => slot.available).length, 0
        ) ?? 0;
        const onDateAvailableSlots = dateToUse
          ? (c.availability?.find((d: any) => d.date === dateToUse)?.tee_times.filter((t: any) => t.available).length ?? 0)
          : undefined;
        const hasAvailability = dateToUse ? (onDateAvailableSlots ?? 0) > 0 : totalAvailable > 0;
        const availabilityScore = dateToUse ? (onDateAvailableSlots ?? 0) : totalAvailable;
        return {
          ...c,
          totalAvailable,
          hasAvailability,
          onDateAvailableSlots,
          availabilityScore,
        };
      });
  }, [toolOutput?.courses, toolOutput?.course, toolOutput?.searchContext?.matched_date, selectedDate]);

  // Debug: Log courses to check verified property
  useEffect(() => {
    if (coursesWithAvailability.length > 0) {
      console.log('Courses with availability:', coursesWithAvailability.map((c: any) => ({ 
        name: c.name, 
        verified: c.verified,
        id: c.id 
      })));
    }
  }, [coursesWithAvailability]);

  // Track when courses are loaded
  useEffect(() => {
    if (toolOutput?.courses && toolOutput.courses.length > 0) {
      setHasLoadedOnce(true);
      setIsLoading(false);
    }
  }, [toolOutput?.courses]);

  const selectedCourse = useMemo(() => {
    const id = state?.selectedCourseId;
    return (coursesWithAvailability ?? []).find((c) => c.id === id) ?? null;
  }, [state?.selectedCourseId, coursesWithAvailability]);

  const onSelectCourse = useCallback((id: string) => {
    console.log('🎯 [onSelectCourse] CLICKED COURSE ID:', id);
    
    // If clicking the same course, deselect it
    if (state?.selectedCourseId === id) {
      console.log('⚠️ [onSelectCourse] Same course clicked - deselecting');
      setState((prev) => ({ ...(prev ?? { __v: 1, viewport: { center: [-117.1611, 32.7157], zoom: 10 } }), selectedCourseId: undefined }));
      setWaitlistSuccess(false);
    } else {
      console.log('✅ [onSelectCourse] New course selected:', id);
      setState((prev) => ({ ...(prev ?? { __v: 1, viewport: { center: [-117.1611, 32.7157], zoom: 10 } }), selectedCourseId: id }));
      setWaitlistSuccess(false);
      
      // Find the course
      console.log('🔍 [onSelectCourse] Searching in coursesWithAvailability, total courses:', coursesWithAvailability?.length);
      const course = coursesWithAvailability.find((c: any) => c.id === id);
      console.log('📍 [onSelectCourse] Found course:', course?.name);
      
      // If course has TeeBox provider, fetch tee times
      console.log('🔧 [onSelectCourse] Checking conditions:');
      console.log('  - Provider:', course?.provider, '(teebox or teefox?)');
      console.log('  - Provider ID:', course?.provider_id);
      console.log('  - Selected Date:', selectedDate);
      
      if ((course?.provider === 'teebox' || course?.provider === 'teefox') && course?.provider_id && selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        console.log('🚀 [onSelectCourse] INITIATING TEE TIME SEARCH');
        console.log('  - Location ID:', course.provider_id);
        console.log('  - Date:', dateStr);
        fetchTeeTimes(course.provider_id, dateStr);
      } else {
        console.log('❌ [onSelectCourse] NOT fetching tee times - condition failed');
      }
      
      // Fetch details via MCP
      callTool && callTool("get_course_details", { courseId: id });
      
      // Center the card on screen after a brief delay to allow expansion
      setTimeout(() => {
        const cardElement = courseCardRefs.current.get(id);
        if (cardElement) {
          const cardRect = cardElement.getBoundingClientRect();
          const cardCenterX = cardRect.left + cardRect.width / 2;
          const screenCenterX = window.innerWidth / 2;
          const scrollOffset = cardCenterX - screenCenterX;
          
          // Smooth scroll to center the card horizontally
          cardElement.parentElement?.scrollBy({
            left: scrollOffset,
            behavior: 'smooth'
          });
        }
      }, 50); // Small delay to allow card to start expanding
    }
  }, [state?.selectedCourseId, setState, coursesWithAvailability, selectedDate, fetchTeeTimes, callTool]);

  // Handle waitlist submission
  const handleWaitlistSubmit = async (courseId: string, providerId: string) => {
    setWaitlistSubmitting(true);
    
    // Simulate API call (for now, just return success)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setWaitlistSubmitting(false);
    setWaitlistSuccess(true);
  };

  // Scroll to selected course card when selection changes
  useEffect(() => {
    if (state?.selectedCourseId) {
      const cardElement = courseCardRefs.current.get(state.selectedCourseId);
      if (cardElement) {
        cardElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [state?.selectedCourseId]);

  const onBook = async () => {
    if (!state?.selectedCourseId) return;
    await callTool?.("book_tee_time", { courseId: state.selectedCourseId });
  };

  const handleMapReady = useCallback((map: mapboxgl.Map) => {
    mapRef.current = map;
  }, []);

  const handleCardHover = useCallback((courseId: string, isHovering: boolean) => {
    // This would show/hide popups on card hover
    // Implementation handled by MapMarkers component
  }, []);

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ maxHeight, height: maxHeight ?? "100vh" }}
    >
      {/* Full-screen Map */}
      <div className="absolute inset-0">
        <MapContainer
          token={token}
          noToken={noToken}
          noWebGL={noWebGL}
          workerReady={workerReady}
          state={state}
          setState={setState}
          onMapReady={handleMapReady}
          setNoToken={setNoToken}
          setNoWebGL={setNoWebGL}
        />
      </div>

      {/* Map Markers */}
      <MapMarkers
        map={mapRef.current}
        courses={coursesWithAvailability}
        selectedCourseId={state?.selectedCourseId}
        onSelectCourse={onSelectCourse}
        state={state}
      />

      {/* Map Fit Bounds */}
      <MapFitBounds
        map={mapRef.current}
        courses={coursesWithAvailability}
        safeAreaBottom={safeArea?.insets?.bottom ?? 0}
      />

      {/* Date Picker & Legend - Top Left */}
      {coursesWithAvailability?.length > 0 && (
        <div 
          className="absolute top-4 left-4 z-10 pointer-events-auto date-picker-container flex gap-2"
          onMouseEnter={() => setShowLegend(true)}
          onMouseLeave={() => setShowLegend(false)}
        >
          {/* Logo */}
          <a 
            href="https://golf.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-white/95 backdrop-blur-sm rounded-lg border border-[var(--color-ui-line)] shadow-lg overflow-hidden p-2 hover:bg-white transition-colors block"
          >
            <img 
              src={displayMode === 'fullscreen' ? 'https://i.postimg.cc/q709vj6t/logo-inline.jpg' : 'https://i.postimg.cc/4dxqzy5V/logo-fullscreen.jpg'}
              alt="Golf.ai Logo"
              className="h-[26px] w-auto object-contain"
            />
          </a>

          {/* Date Picker */}
          <DatePicker
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            displayMode={displayMode}
          />

          {/* Availability Legend - Shows on hover */}
          <Legend showLegend={showLegend} />
        </div>
      )}

      {/* Top Controls */}
      <TopControls
        displayMode={displayMode}
        onToggleDisplayMode={() => requestDisplayMode(displayMode === "fullscreen" ? "inline" : "fullscreen")}
        onToggleDebug={() => setShowDebugInfo(!showDebugInfo)}
      />

      {/* Debug Info Panel */}
      <DebugPanel
        showDebugInfo={showDebugInfo}
        hasOpenAI={hasOpenAI}
        displayMode={displayMode}
        maxHeight={maxHeight}
        safeArea={safeArea}
        theme={theme}
        locale={locale}
        userAgent={userAgent}
        toolInput={toolInput}
        toolOutputFromHook={toolOutputFromHook}
        toolResponseMetadata={toolResponseMetadata}
        state={state}
        coursesCount={toolOutput?.courses?.length ?? 0}
        selectedCourse={selectedCourse}
        localDisplayMode={localDisplayMode}
        setLocalDisplayMode={setLocalDisplayMode}
      />

      {/* Bottom Course Cards */}
      {coursesWithAvailability?.length ? (
        <div 
          className="absolute bottom-0 left-0 right-0 z-10"
          style={{ 
            paddingBottom: `${(safeArea?.insets?.bottom ?? 0) + 12}px`,
            pointerEvents: 'none'
          }}
        >
          <div className="overflow-x-auto overflow-y-visible px-4 pb-2 scrollbar-hide">
            <div className="flex items-end gap-3 min-w-min py-2">
              {coursesWithAvailability.map((c) => {
                const isSelected = state?.selectedCourseId === c.id;
                const dimForNoAvail = (toolOutput?.searchContext?.matched_date && !c.hasAvailability);
                
                return (
                  <CourseCard
                    key={c.id}
                    course={c}
                    isSelected={isSelected}
                    dimForNoAvail={!!dimForNoAvail}
                    displayMode={displayMode}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    teeTimeFilters={teeTimeFilters}
                    onTeeTimeFiltersChange={setTeeTimeFilters}
                    loadingTeeTimes={loadingTeeTimes}
                    teeTimesData={teeTimesData}
                    teeTimesError={teeTimesError}
                    waitlistData={waitlistData}
                    onWaitlistDataChange={setWaitlistData}
                    onWaitlistSubmit={() => c.provider_id && handleWaitlistSubmit(c.id, c.provider_id)}
                    waitlistSubmitting={waitlistSubmitting}
                    waitlistSuccess={waitlistSuccess}
                    onWaitlistSuccessClose={() => setWaitlistSuccess(false)}
                    onSelectCourse={onSelectCourse}
                    onFetchTeeTimes={fetchTeeTimes}
                    onBook={onBook}
                    onCardHover={handleCardHover}
                    cardRef={(el) => {
                      if (el) {
                        courseCardRefs.current.set(c.id, el);
                      } else {
                        courseCardRefs.current.delete(c.id);
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <LoadingState />
      )}

      {/* Selected Course Detail Panel (Optional - appears when course selected) */}
      {selectedCourse && toolOutput?.course?.id === selectedCourse.id && (
        <div className="absolute top-20 left-4 right-4 md:left-auto md:right-4 md:w-[360px] z-20 bg-white rounded-[20px] shadow-2xl overflow-hidden">
          <div className="relative h-[200px] bg-gradient-to-br from-[var(--color-accent-teal)] to-[var(--color-primary-red)]">
            <img
              src={`https://i.postimg.cc/dVhLc1DR/Generated-Image-October-16-2025-3-01-PM.png`}
              alt={selectedCourse.name}
              className="w-full h-full object-cover"
            />
            <button
              className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center hover:bg-white transition"
              onClick={() => setState((prev) => ({ ...(prev ?? { __v: 1, viewport: { center: [-117.1611, 32.7157], zoom: 10 } }), selectedCourseId: undefined }))}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="p-6">
            <h2 className="text-xl font-bold text-[var(--color-ink-black)] mb-2">{selectedCourse.name}</h2>
            <p className="text-sm text-[var(--color-ink-gray)] mb-4">
              {selectedCourse.city}{selectedCourse.state ? `, ${selectedCourse.state}` : ""}
            </p>
            {toolOutput?.course?.description && (
              <p className="text-sm text-[var(--color-ink-black)] mb-4">{toolOutput.course.description}</p>
            )}
            <div className="flex gap-2">
              <button
                className="flex-1 bg-[var(--color-primary-red)] text-white rounded-[8px] px-4 py-3 text-sm font-medium hover:opacity-90 transition"
                onClick={onBook}
              >
                Book Tee Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
