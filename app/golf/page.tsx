  "use client";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
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
import BlocksWaveIcon from "./BlocksWaveIcon";
import { getCoursesNearSanDiego } from "../actions/getCourses";
import { useTeeTimes } from "../hooks";
import type { TeeTime } from "../api/teefox/route";

// Types for tool outputs we expect
type CoursePoint = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  lon: number;
  lat: number;
  type?: "public" | "private" | "semi-private" | "resort";
  verified?: boolean;
  distance?: number;
  website?: string | null;
  provider?: string | null;
  provider_id?: string | null;
  availability?: Array<{
    date: string;
    tee_times: Array<{
      time: string;
      available: boolean;
      price: number;
      players_available: number;
    }>;
  }>;
  matched_date?: string;
  available_on_date?: boolean;
};

type GolfWidgetState = {
  __v: 1;
  viewport: { center: [number, number]; zoom: number };
  selectedCourseId?: string;
};

function StaticMapFallback({ token, center, zoom }: { token: string; center: [number, number]; zoom: number }) {
  const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${center[0]},${center[1]},${zoom},0/1280x800@2x?access_token=${token}`;
  return (
    <img src={url} alt="Map" className="h-full w-full object-cover" />
  );
}

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
          // Server action already returns the correct format
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
  const displayMode = hasOpenAI ? displayModeFromSDK : localDisplayMode;
  
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  
  useEffect(() => {
    setWorkerReady(true);
  }, []);

  // Tee times state
  const { loading: loadingTeeTimes, error: teeTimesError, data: teeTimesData, fetchTeeTimes } = useTeeTimes();
  console.log('teetimesdata', teeTimesData)
  // Tee times filters
  const [teeTimeFilters, setTeeTimeFilters] = useState({
    patrons: 4,
    holes: 18,
    minPrice: 0,
    maxPrice: 200,
  });
  
  // Waitlist form state
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistData, setWaitlistData] = useState({
    name: 'Peter Bergin',
    email: 'peter@golf.ai',
    phone: '',
    timeStart: '08:00',
    timeEnd: '18:00',
  });
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const markerPopupsRef = useRef<Map<string, mapboxgl.Popup>>(new Map()); // Store popups by course ID
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

  const maxAvailabilityScore = useMemo(() => {
    const scores = (coursesWithAvailability ?? []).map((c: any) => c?.availabilityScore ?? 0);
    const m = Math.max(0, ...scores);
    return Number.isFinite(m) ? m : 0;
  }, [coursesWithAvailability]);

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

  // Color spectrum: Green (high availability) → Yellow → Red (low availability)
  const COLOR_SPECTRUM = [
    '#69B34C', // Green - Very available
    '#ACB334', // Yellow-green - Good availability
    '#FAB733', // Yellow - Medium availability
    '#FF8E15', // Orange - Low availability
    '#FF4E11', // Red-orange - Very low availability
    '#FF0D0D', // Red - Not available
  ];

  const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const hexToRgb = (h: string) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
  const rgbToHex = (r: number, g: number, b: number) => `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  
  const getMarkerColor = (c: any) => {
    // If no provider, return black
    if (!c?.provider || !c?.provider_id) {
      return '#000000';
    }
    
    // For courses with provider, use random color allocation
    // Create a deterministic "random" color based on course ID
    const hash = c.id.split('').reduce((acc: number, char: string) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Use hash to pick a color from the spectrum
    const colorIndex = Math.abs(hash) % COLOR_SPECTRUM.length;
    return COLOR_SPECTRUM[colorIndex];
  };

  // Track when courses are loaded
  useEffect(() => {
    if (toolOutput?.courses && toolOutput.courses.length > 0) {
      setHasLoadedOnce(true);
      setIsLoading(false);
    }
  }, [toolOutput?.courses]);

  // Determine card size based on device and display mode
  const cardWidth = useMemo(() => {
    const deviceType = userAgent?.device?.type ?? "desktop";
    const mode = displayMode ?? "inline";
    
    // Mobile devices get smaller cards
    if (deviceType === "mobile") {
      return mode === "fullscreen" ? 200 : 160;
    }
    
    // Tablet gets medium cards
    if (deviceType === "tablet") {
      return mode === "fullscreen" ? 240 : 200;
    }
    
    // Desktop gets full-size cards
    return 280;
  }, [userAgent, displayMode]);

  const cardImageHeight = useMemo(() => {
    const deviceType = userAgent?.device?.type ?? "desktop";
    const mode = displayMode ?? "inline";
    
    if (deviceType === "mobile") {
      return mode === "fullscreen" ? 100 : 80;
    }
    
    if (deviceType === "tablet") {
      return mode === "fullscreen" ? 120 : 100;
    }
    
    return 140;
  }, [userAgent, displayMode]);

  useEffect(() => {
    console.log('🗺️ [Map Init Effect] Starting...', {
      hasToken: !!token,
      workerReady,
      coursesCount: coursesWithAvailability?.length ?? 0,
      hasSafeArea: !!safeArea,
      hasState: !!state
    });
    if (mapRef.current) {
      console.log('⚠️ [Map Init Effect] Map already exists, skipping');
      return;
    }

    let disposed = false;
    let raf = 0 as number | undefined;
    let timeout = 0 as number | undefined;
    let attemptCount = 0;
    let hasWaited = false;

    const tryInit = () => {
      attemptCount++;
      console.log(`🔄 [Map Init] Attempt #${attemptCount}`);
      
      if (disposed || mapRef.current) {
        console.log('⚠️ [Map Init] Disposed or map exists, stopping');
        return;
      }

      const el = (document.getElementById("golf-map") as HTMLElement | null) ?? mapContainer.current;
      if (!el || !el.isConnected) {
        console.log('❌ [Map Init] Container not ready:', { 
          exists: !!el, 
          isConnected: el?.isConnected 
        });
        raf = requestAnimationFrame(tryInit as FrameRequestCallback);
        return;
      }

      if (!hasWaited && attemptCount < 5) {
        console.log('⏳ [Map Init] Waiting for hydration...');
        hasWaited = true;
        timeout = setTimeout(() => {
          if (!disposed) tryInit();
        }, 100) as unknown as number;
        return;
      }

      const rect = el.getBoundingClientRect();
      console.log('📐 [Map Init] Container dimensions:', { 
        width: rect.width, 
        height: rect.height,
        top: rect.top,
        left: rect.left
      });
      
      if (rect.width === 0 || rect.height === 0) {
        console.log('❌ [Map Init] Container has zero dimensions, retrying...');
        raf = requestAnimationFrame(tryInit as FrameRequestCallback);
        return;
      }

      if (!workerReady) {
        console.log('❌ [Map Init] Worker not ready, retrying...');
        raf = requestAnimationFrame(tryInit as FrameRequestCallback);
        return;
      }

      if (!token) {
        console.log('❌ [Map Init] No Mapbox token');
        setNoToken(true);
        return;
      }
      
      const supported = mapboxgl.supported({ failIfMajorPerformanceCaveat: false });
      console.log('🔍 [Map Init] WebGL supported:', supported);
      
      if (!supported) {
        console.log('❌ [Map Init] WebGL not supported, using fallback');
        setNoWebGL(true);
        return;
      }
      
      console.log('✅ [Map Init] All checks passed, creating map...');
      mapboxgl.accessToken = token;
      
      console.log('🏗️ [Map Init] Creating Mapbox instance with container id "golf-map"...');
      try {
        const map = new mapboxgl.Map({
          container: 'golf-map',
          style: "mapbox://styles/mapbox/streets-v12",
          center: [-117.1611, 32.7157],
          zoom: 10,
        });
        console.log('✅ [Map Init] Map instance created successfully');
        mapRef.current = map;

        map.on("moveend", () => {
          const center = map.getCenter();
          const zoom = map.getZoom();
          setState((prev) => ({
            ...(prev ?? { __v: 1, viewport: { center: [-117.1611, 32.7157], zoom: 10 } }),
            viewport: { center: [center.lng, center.lat], zoom },
          }));
        });

        map.on("load", () => {
          console.log('🎉 [Map Init] Map loaded and ready');
          map.resize();
        });
        
        map.on("error", (e) => {
          console.error('❌ [Map Init] Map error:', e);
        });
      } catch (error) {
        console.error('❌ [Map Init] Failed to create map:', error);
      }
    };

    tryInit();

    return () => {
      console.log('🧹 [Map Init] Cleanup running');
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (timeout) clearTimeout(timeout);
      if (mapRef.current) {
        console.log('🗑️ [Map Init] Removing existing map');
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [setState, token, workerReady]);

  // Add custom markers when courses change
  useEffect(() => {
    const map = mapRef.current;
    console.log('📍 [Markers Effect] Running...', { 
      hasMap: !!map, 
      coursesCount: coursesWithAvailability?.length ?? 0 
    });
    if (!map) return;

    const addMarkers = () => {
      console.log('🎯 [Markers] Adding markers for', coursesWithAvailability?.length ?? 0, 'courses');
      // Remove existing markers and popups
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      markerPopupsRef.current.clear();

      // Add new markers
      coursesWithAvailability.forEach((course) => {
        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.dataset.courseId = course.id;
        
        const color = getMarkerColor(course);
        
        // Check if this is a highly available course (top 30% of available slots)
        // AND has good availability (normalized score > 0.6, which maps to green/yellow colors)
        const maxAvailable = Math.max(...coursesWithAvailability.map(c => c.totalAvailable));
        const normalizedScore = maxAvailable > 0 ? course.availabilityScore / maxAvailable : 0;
        const isHighlyAvailable = course.totalAvailable > maxAvailable * 0.7 && normalizedScore > 0.6;
        
        // Create marker HTML with teardrop shape
        el.innerHTML = `
          <div class="marker-inner" style="
            position: relative;
            width: 25px;
            height: 25px;
            background-color: ${color};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: all 0.2s ease-out;
          ">
            ${isHighlyAvailable ? `
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(45deg);
                color: white;
                font-size: 14px;
                font-weight: bold;
              ">★</div>
            ` : ''}
          </div>
        `;
        
        // Add hover effect for marker
        el.addEventListener('mouseenter', () => {
          const markerDiv = el.querySelector('.marker-inner') as HTMLElement;
          if (markerDiv) markerDiv.style.transform = 'rotate(-45deg) scale(1.2)';
        });
        el.addEventListener('mouseleave', () => {
          const markerDiv = el.querySelector('.marker-inner') as HTMLElement;
          if (markerDiv) markerDiv.style.transform = 'rotate(-45deg) scale(1)';
        });
        
        // Create popup with course name
        const popup = new mapboxgl.Popup({
          offset: 15,
          anchor: 'bottom',
          closeButton: false,
          closeOnClick: false,
          closeOnMove: false,
          focusAfterOpen: false,
          maxWidth: 'none',
          className: 'course-name-popup'
        }).setHTML(`
          <div style="
            padding: 2px 2px;
            font-size: 14px;
            font-weight: 600;
            color: #1a1a1a;
            white-space: nowrap;
            background: white;
            border-radius: 4px;
          ">
            ${course.name}
          </div>
        `).setLngLat([course.lon!, course.lat!]);
        
        // Store popup reference
        markerPopupsRef.current.set(course.id, popup);
        
        // Create marker
        const marker = new mapboxgl.Marker(el)
          .setLngLat([course.lon!, course.lat!])
          .addTo(map);
        
        // Show popup on marker hover (only if not selected)
        el.addEventListener('mouseenter', () => {
          if (state?.selectedCourseId !== course.id && !popup.isOpen()) {
            popup.addTo(map);
          }
        });
        el.addEventListener('mouseleave', () => {
          if (state?.selectedCourseId !== course.id) {
            popup.remove();
          }
        });
        
        // Add click handler - use onSelectCourse to trigger tee time fetch
        el.addEventListener('click', () => {
          console.log('🗺️ [Marker Click] Course:', course.id);
          onSelectCourse(course.id);
        });
        
        markersRef.current.push(marker);
      });
    };

    if (map.isStyleLoaded()) addMarkers();
    else map.once('load', addMarkers);

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [coursesWithAvailability, setState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const doFit = () => {
      const pts = (coursesWithAvailability ?? []).filter(c => typeof c.lon === 'number' && typeof c.lat === 'number');
      if (pts.length === 0) return;
      const bottomPad = (safeArea?.insets?.bottom ?? 0) + 180;
      if (pts.length === 1) {
        const p = pts[0];
        const bounds = new mapboxgl.LngLatBounds([p.lon! - 0.01, p.lat! - 0.01], [p.lon! + 0.01, p.lat! + 0.01]);
        map.fitBounds(bounds, { padding: { top: 40, right: 40, bottom: bottomPad, left: 40 }, duration: 300 });
        return;
      }
      let bounds = new mapboxgl.LngLatBounds([pts[0].lon!, pts[0].lat!], [pts[0].lon!, pts[0].lat!]);
      for (let i = 1; i < pts.length; i++) bounds.extend([pts[i].lon!, pts[i].lat!]);
      map.fitBounds(bounds, { padding: { top: 40, right: 40, bottom: bottomPad, left: 40 }, duration: 300, maxZoom: 13 });
    };

    if (map.isStyleLoaded()) doFit();
    else map.once('load', doFit);
  }, [coursesWithAvailability, safeArea?.insets?.bottom]);

  // Update popup visibility when selected course changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerPopupsRef.current.forEach((popup, courseId) => {
      const isSelected = state?.selectedCourseId === courseId;
      
      if (isSelected) {
        // Show popup for selected course and keep it open
        if (!popup.isOpen()) {
          popup.addTo(map);
        }
      } else {
        // Hide popup for non-selected courses
        if (popup.isOpen()) {
          popup.remove();
        }
      }
    });
  }, [state?.selectedCourseId]);

  const selectedCourse = useMemo(() => {
    const id = state?.selectedCourseId;
    return (coursesWithAvailability ?? []).find((c) => c.id === id) ?? null;
  }, [state?.selectedCourseId, coursesWithAvailability]);

  const onSelectCourse = (id: string) => {
    console.log('🎯 [onSelectCourse] CLICKED COURSE ID:', id);
    
    // If clicking the same course, deselect it
    if (state?.selectedCourseId === id) {
      console.log('⚠️ [onSelectCourse] Same course clicked - deselecting');
      setState((prev) => ({ ...(prev ?? { __v: 1, viewport: { center: [-117.1611, 32.7157], zoom: 10 } }), selectedCourseId: undefined }));
      setShowWaitlistForm(false);
      setWaitlistSuccess(false);
    } else {
      console.log('✅ [onSelectCourse] New course selected:', id);
      setState((prev) => ({ ...(prev ?? { __v: 1, viewport: { center: [-117.1611, 32.7157], zoom: 10 } }), selectedCourseId: id }));
      setShowWaitlistForm(false);
      setWaitlistSuccess(false);
      
      // Find the course
      console.log('🔍 [onSelectCourse] Searching in coursesWithAvailability, total courses:', coursesWithAvailability?.length);
      const course = coursesWithAvailability.find((c: any) => c.id === id);
      console.log('📍 [onSelectCourse] Found course:', course?.name);
      
      // If course has TeeBox provider, fetch tee times
      // Initial fetch without filters - user can apply filters after card opens
      console.log('🔧 [onSelectCourse] Checking conditions:');
      console.log('  - Provider:', course?.provider, '(teebox or teefox?)');
      console.log('  - Provider ID:', course?.provider_id);
      console.log('  - Selected Date:', selectedDate);
      console.log('  - Has provider?', (course?.provider === 'teebox' || course?.provider === 'teefox'));
      console.log('  - Has provider_id?', !!course?.provider_id);
      console.log('  - Has selectedDate?', !!selectedDate);
      
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
  };

  // Handle waitlist submission
  const handleWaitlistSubmit = async (courseId: string, providerId: string) => {
    setWaitlistSubmitting(true);
    
    // Simulate API call (for now, just return success)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // TODO: Actual API call to TeeBox
    // const response = await fetch('/api/teefox/waitlist', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     userIdentifier: waitlistData.email,
    //     budget: 500, // Max budget
    //     apptTimeStart: `${selectedDate?.toISOString().split('T')[0]}T${waitlistData.timeStart}:00`,
    //     apptTimeEnd: `${selectedDate?.toISOString().split('T')[0]}T${waitlistData.timeEnd}:00`,
    //     patrons: teeTimeFilters.patrons,
    //     courseIds: [providerId],
    //     requestType: 'waitlist'
    //   })
    // });
    
    setWaitlistSubmitting(false);
    setWaitlistSuccess(true);
    setShowWaitlistForm(false);
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

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDatePicker && !target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  const onBook = async () => {
    if (!state?.selectedCourseId) return;
    await callTool?.("book_tee_time", { courseId: state.selectedCourseId });
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ maxHeight, height: maxHeight ?? "100vh" }}
    >
      {/* Full-screen Map */}
      <div className="absolute inset-0">
        {noToken ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-[var(--color-ink-gray)] p-6 bg-[var(--color-bg-cream)]">
            Mapbox token missing. Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in your environment to enable the map.
          </div>
        ) : noWebGL ? (
          <StaticMapFallback token={token} center={state?.viewport?.center ?? [-117.1611, 32.7157]} zoom={state?.viewport?.zoom ?? 10} />
        ) : (
          <div id="golf-map" ref={mapContainer} className="h-full w-full" />
        )}
      </div>

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
          <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-[var(--color-ui-line)] shadow-lg flex items-center justify-center">
            <div className="relative">
              <button
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-[var(--color-ink-black)] hover:bg-gray-50 rounded-lg transition-colors w-full"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select Date'}</span>
              </button>
              
              {/* Simple Date Picker Dropdown */}
              {showDatePicker && (
                <div 
                  className="absolute top-full left-0 mt-2 bg-white rounded-lg border border-[var(--color-ui-line)] shadow-xl min-w-[200px]"
                  style={{ 
                    maxHeight: displayMode === 'inline' ? '200px' : '300px',
                    overflowY: 'auto'
                  }}
                >
                  <div className="p-2 space-y-1">
                    {/* Next 14 days */}
                    {Array.from({ length: 14 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + i);
                      const isSelected = selectedDate?.toDateString() === date.toDateString();
                      return (
                        <button
                          key={i}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            isSelected 
                              ? 'bg-[var(--color-primary-red)] text-white' 
                              : 'hover:bg-gray-100 text-[var(--color-ink-black)]'
                          }`}
                          onClick={() => {
                            setSelectedDate(date);
                            setShowDatePicker(false);
                          }}
                        >
                          <div className="text-sm">
                            {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'long' })}
                          </div>
                          <div className="text-xs opacity-75">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Availability Legend - Shows on hover, same height as date picker button */}
          <div 
            className={`bg-white/95 backdrop-blur-sm rounded-lg border border-[var(--color-ui-line)] shadow-lg overflow-hidden transition-all duration-300 ease-out ${
              showLegend ? 'max-w-[250px] opacity-100' : 'max-w-0 opacity-0'
            }`}
            style={{ height: '42px' }}
          >
            <div className="flex items-center gap-3 px-3 h-full whitespace-nowrap">
              <div className="text-[14px] font-bold text-[var(--color-ink-black)]">Availability</div>
              <div className="flex-1 min-w-[100px]">
                {/* Color gradient bar */}
                <div className="h-2 rounded-full mb-1" style={{
                  background: 'linear-gradient(to right, #FF0D0D, #FF4E11, #FF8E15, #FAB733, #ACB334, #69B34C)'
                }}></div>
                {/* Labels */}
                <div className="flex justify-between text-[9px] text-[var(--color-ink-gray)]">
                  <span>Booked</span>
                  <span>Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2 items-start pointer-events-none">
        {/* Expand/Contract Button */}
        <button
          className="bg-white/95 backdrop-blur-sm rounded-lg border border-[var(--color-ui-line)] shadow-lg p-2.5 hover:bg-white transition-all pointer-events-auto group"
          onClick={() => requestDisplayMode(displayMode === "fullscreen" ? "inline" : "fullscreen")}
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
          onClick={() => setShowDebugInfo(!showDebugInfo)}
          aria-label="Toggle debug info"
          title="Toggle debug info"
        >
          <svg className="w-5 h-5 text-[var(--color-ink-black)] group-hover:text-[var(--color-accent-teal)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Debug Info Panel */}
      {showDebugInfo && (
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
                      onClick={() => setLocalDisplayMode(prev => prev === 'inline' ? 'fullscreen' : 'inline')}
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
              <div><span className="text-[var(--color-ink-gray)]">courses:</span> <span className="font-semibold">{toolOutput?.courses?.length ?? 0}</span></div>
              <div><span className="text-[var(--color-ink-gray)]">selectedCourse:</span> <span className="font-semibold">{state?.selectedCourseId ?? 'none'}</span></div>
              <div><span className="text-[var(--color-ink-gray)]">viewport.zoom:</span> <span className="font-semibold">{state?.viewport?.zoom?.toFixed(2) ?? 'N/A'}</span></div>
              <div><span className="text-[var(--color-ink-gray)]">selectedCourseColor:</span> <span className="font-semibold">{selectedCourse ? getMarkerColor(selectedCourse as any) : 'N/A'}</span></div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Course Cards */}
      {coursesWithAvailability?.length ? (
        <div 
          className="absolute bottom-0 left-0 right-0 z-10"
          style={{ 
            paddingBottom: `${(safeArea?.insets?.bottom ?? 0) + 12}px` 
          }}
        >
          <div className="overflow-x-auto overflow-y-visible px-4 pb-2 scrollbar-hide">
            <div className="flex items-end gap-3 min-w-min py-2">
              {coursesWithAvailability.map((c) => {
                const isSelected = state?.selectedCourseId === c.id;
                const dimForNoAvail = (toolOutput?.searchContext?.matched_date && !c.hasAvailability);
                
                // Calculate width based on whether this specific card has TeeBox provider
                const cardWidth = isSelected 
                  ? ((c.provider === 'teebox' || c.provider === 'teefox') && c.provider_id 
                      ? (displayMode === 'inline' ? 600 : 600) 
                      : (displayMode === 'inline' ? 280 : 320))
                  : 280;
                
                return (
                  <div
                    key={c.id}
                    ref={(el) => {
                      if (el) {
                        courseCardRefs.current.set(c.id, el as any);
                      } else {
                        courseCardRefs.current.delete(c.id);
                      }
                    }}
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
                      transformOrigin: 'bottom center'
                    }}
                    onClick={() => !isSelected && onSelectCourse(c.id)}
                    onMouseEnter={() => {
                      // Show popup on card hover (only if not selected)
                      if (state?.selectedCourseId !== c.id) {
                        const popup = markerPopupsRef.current.get(c.id);
                        const map = mapRef.current;
                        if (popup && map && !popup.isOpen()) {
                          popup.addTo(map);
                        }
                      }
                    }}
                    onMouseLeave={() => {
                      // Hide popup when leaving card (only if not selected)
                      if (state?.selectedCourseId !== c.id) {
                        const popup = markerPopupsRef.current.get(c.id);
                        if (popup && popup.isOpen()) {
                          popup.remove();
                        }
                      }
                    }}
                  >
                    {/* Compact Layout (Not Selected) */}
                    {!isSelected ? (
                      <div className="relative flex items-center gap-3 p-3">
                        {/* Verified Badge - Top Left of Card */}
                        {c.verified && (
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
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Course Info */}
                        <div className="flex-1 text-left min-w-0">
                          <h3 className="font-bold text-[var(--color-ink-black)] text-sm mb-1 line-clamp-1">
                            {c.name}
                          </h3>
                          <p className="text-[var(--color-ink-gray)] text-xs mb-2 line-clamp-1">
                            {c.city}{c.state ? `, ${c.state}` : ""}
                          </p>
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            {typeof c.distance === "number" && (
                              <span className="text-[var(--color-ink-gray)]">
                                {c.distance} mi
                              </span>
                            )}
                            {c.type && (
                              <span className="px-2 py-0.5 rounded-md bg-[var(--color-bg-cream)] text-black font-medium text-xs capitalize">{c.type}</span>
                            )}
                            {/* Book Now tag for TeeBox courses */}
                            {(c.provider === 'teebox' || c.provider === 'teefox') && c.provider_id && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-primary-red)] text-white font-semibold text-[10px]">
                                BOOK NOW
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Expanded Layout (Selected) */
                      <>
                        {displayMode === 'inline' ? (
                          /* INLINE COMPACT LAYOUT */
                          <div className="flex gap-2 p-2 items-top">
                            {/* Left: Course Image */}
                            <div 
                              className="relative bg-gradient-to-br from-[var(--color-accent-teal)] to-[var(--color-primary-red)] overflow-hidden rounded-lg flex-shrink-0"
                              style={{ width: '100px', height: '100px' }}
                            >
                              <img
                                src={`https://i.postimg.cc/dVhLc1DR/Generated-Image-October-16-2025-3-01-PM.png`}
                                alt={c.name}
                                className="w-full h-full object-cover"
                              />
                              {c.verified && (
                                <img
                                  src="https://i.postimg.cc/WbqRWDPb/verfied-badge.png"
                                  alt="Golf.AI Verified"
                                  className="absolute top-0 left-1 w-8 h-10 drop-shadow-lg"
                                />
                              )}
                            </div>

                            {/* Right: Course Info */}
                            <div className="flex-1 flex flex-col min-w-0 justify-center">
                              {/* Close Button - Absolute Top Right */}
                              <button
                                className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1 hover:bg-white transition-all group z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectCourse(c.id);
                                }}
                                aria-label="Close"
                              >
                                <svg className="w-3.5 h-3.5 text-[var(--color-ink-black)] group-hover:text-[var(--color-primary-red)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>

                              {/* Top Row: Name, Location, No Tee Times Badge */}
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-sm text-[var(--color-ink-black)] break-words">
                                    {c.name}
                                  </h3>
                                  <p className="text-xs text-[var(--color-ink-gray)]">
                                    {c.city}{c.state ? `, ${c.state}` : ""}
                                  </p>
                                </div>
                                {(c.provider === 'teebox' || c.provider === 'teefox') && c.provider_id && teeTimesData?.teetimes && teeTimesData.teetimes.length === 0 && !waitlistSuccess && (
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 rounded flex-shrink-0">
                                    <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-semibold text-[10px] text-orange-700 whitespace-nowrap">No Tee Times</span>
                                  </div>
                                )}
                              </div>

                              {/* Second Row: Tags */}
                              <div className="flex gap-1 flex-wrap mb-auto">
                                {c.type && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--color-bg-cream)] text-black font-medium capitalize text-[10px]">
                                    {c.type}
                                  </span>
                                )}
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--color-bg-cream)] text-black font-medium text-[10px]">
                                  18 holes
                                </span>
                                {c.verified && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] font-bold text-[10px]">
                                    VERIFIED
                                  </span>
                                )}
                              </div>

                              {/* Bottom Row: Button (for no booking) OR Tee Times/Waitlist */}
                              {(c.provider === 'teebox' || c.provider === 'teefox') && c.provider_id ? (
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
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <button
                                          className="p-0.5 hover:bg-gray-100 rounded transition disabled:opacity-30"
                                          disabled={!!(selectedDate && selectedDate.toDateString() === new Date().toDateString())}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (selectedDate) {
                                              const today = new Date();
                                              today.setHours(0, 0, 0, 0);
                                              const selected = new Date(selectedDate);
                                              selected.setHours(0, 0, 0, 0);
                                              
                                              if (selected > today) {
                                                const newDate = new Date(selectedDate);
                                                newDate.setDate(newDate.getDate() - 1);
                                                setSelectedDate(newDate);
                                                if (c.provider_id) {
                                                  fetchTeeTimes(c.provider_id, newDate.toISOString().split('T')[0], {
                                                    patrons: teeTimeFilters.patrons,
                                                    holes: teeTimeFilters.holes,
                                                  });
                                                }
                                              }
                                            }
                                          }}
                                        >
                                          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                          </svg>
                                        </button>
                                        <span className="text-[10px] font-semibold text-black">
                                          {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                        <button
                                          className="p-0.5 hover:bg-gray-100 rounded transition"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (selectedDate) {
                                              const newDate = new Date(selectedDate);
                                              newDate.setDate(newDate.getDate() + 1);
                                              setSelectedDate(newDate);
                                              if (c.provider_id) {
                                                fetchTeeTimes(c.provider_id, newDate.toISOString().split('T')[0], {
                                                  patrons: teeTimeFilters.patrons,
                                                  holes: teeTimeFilters.holes,
                                                });
                                              }
                                            }
                                          }}
                                        >
                                          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        </button>
                                      </div>

                                      {/* Filter options - compact */}
                                      <div className="flex items-center gap-1 mb-1">
                                        {/* Players dropdown with icon */}
                                        <div className="relative">
                                          <select
                                            value={teeTimeFilters.patrons}
                                            onChange={(e) => {
                                              const newPatrons = parseInt(e.target.value);
                                              setTeeTimeFilters(prev => ({ ...prev, patrons: newPatrons }));
                                              if (c.provider_id && selectedDate) {
                                                fetchTeeTimes(c.provider_id, selectedDate.toISOString().split('T')[0], {
                                                  patrons: newPatrons,
                                                  holes: teeTimeFilters.holes,
                                                });
                                              }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="pl-5 pr-6 py-1 text-[10px] rounded bg-[var(--color-bg-cream)] text-black cursor-pointer appearance-none font-medium"
                                          >
                                            <option value={1}>1 player</option>
                                            <option value={2}>2 players</option>
                                            <option value={3}>3 players</option>
                                            <option value={4}>4 players</option>
                                          </select>
                                          <svg className="w-3 h-3 absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                          </svg>
                                          <svg className="w-2.5 h-2.5 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </div>

                                        {/* Holes dropdown with icon */}
                                        <div className="relative">
                                          <select
                                            value={teeTimeFilters.holes}
                                            onChange={(e) => {
                                              const newHoles = parseInt(e.target.value);
                                              setTeeTimeFilters(prev => ({ ...prev, holes: newHoles }));
                                              if (c.provider_id && selectedDate) {
                                                fetchTeeTimes(c.provider_id, selectedDate.toISOString().split('T')[0], {
                                                  patrons: teeTimeFilters.patrons,
                                                  holes: newHoles,
                                                });
                                              }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="pl-5 pr-6 py-1 text-[10px] rounded bg-[var(--color-bg-cream)] text-black cursor-pointer appearance-none font-medium"
                                          >
                                            <option value={9}>9 holes</option>
                                            <option value={18}>18 holes</option>
                                          </select>
                                          <svg className="w-3 h-3 absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                          </svg>
                                          <svg className="w-2.5 h-2.5 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </div>

                                        {/* Price range display with icon */}
                                        {teeTimesData.teetimes.length > 0 && (() => {
                                          const prices = teeTimesData.teetimes
                                            .map((t: any) => t.pricePerPatron || 0)
                                            .filter((p: number) => p > 0);
                                          if (prices.length > 0) {
                                            const minPrice = Math.min(...prices);
                                            const maxPrice = Math.max(...prices);
                                            return (
                                              <div className="flex items-center gap-0.5 px-1.5 py-1 bg-[var(--color-bg-cream)] rounded">
                                                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-[10px] text-black font-medium">
                                                  {minPrice === maxPrice ? `$${minPrice}` : 'Variable Pricing'}
                                                </span>
                                              </div>
                                            );
                                          }
                                          return (
                                            <div className="flex items-center gap-0.5 px-1.5 py-1 bg-[var(--color-bg-cream)] rounded">
                                              <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                              <span className="text-[10px] text-black font-medium">Variable Pricing</span>
                                            </div>
                                          );
                                        })()}
                                      </div>

                                      {/* Tee times - 2 rows max, horizontally scrollable */}
                                      <div className="overflow-x-auto -mx-2 px-2">
                                        <div className="grid grid-flow-col auto-cols-max gap-1 pb-1" style={{ gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}>
                                          {teeTimesData.teetimes.map((teeTime: any, idx: number) => {
                                            // Parse the time in the course's timezone
                                            const time = new Date(teeTime.apptTime);
                                            const timeStr = time.toLocaleTimeString('en-US', { 
                                              hour: 'numeric', 
                                              minute: '2-digit',
                                              hour12: true,
                                              timeZone: teeTime.timezone // Use the course's timezone
                                            });
                                            // Format price for tooltip
                                            const priceStr = teeTime.pricePerPatron 
                                              ? `$${(teeTime.pricePerPatron / 100).toFixed(2)} per person`
                                              : 'Price not available';
                                            return (
                                              <button
                                                key={idx}
                                                className="px-2 py-1 bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[var(--color-ink-black)] rounded text-[10px] font-medium transition whitespace-nowrap"
                                                title={priceStr}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (teeTime.bookingUrl) {
                                                    const url = teeTime.bookingUrl.startsWith('http') 
                                                      ? teeTime.bookingUrl 
                                                      : `https://${teeTime.bookingUrl}`;
                                                    window.open(url, '_blank');
                                                  }
                                                }}
                                              >
                                                {timeStr}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  ) : teeTimesData.teetimes && teeTimesData.teetimes.length === 0 && !waitlistSuccess ? (
                                    /* Inline Waitlist - Compact */
                                    <div className="space-y-1.5">
                                      {/* Date selector - darker text */}
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <button
                                          className="p-0.5 hover:bg-gray-100 rounded transition disabled:opacity-30"
                                          disabled={!!(selectedDate && selectedDate.toDateString() === new Date().toDateString())}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (selectedDate) {
                                              const newDate = new Date(selectedDate);
                                              newDate.setDate(newDate.getDate() - 1);
                                              setSelectedDate(newDate);
                                              if (c.provider_id) fetchTeeTimes(c.provider_id, newDate.toISOString().split('T')[0], teeTimeFilters);
                                            }
                                          }}
                                        >
                                          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                          </svg>
                                        </button>
                                        <span className="text-[10px] font-semibold text-black">
                                          {selectedDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                        <button
                                          className="p-0.5 hover:bg-gray-100 rounded transition"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (selectedDate) {
                                              const newDate = new Date(selectedDate);
                                              newDate.setDate(newDate.getDate() + 1);
                                              setSelectedDate(newDate);
                                              if (c.provider_id) fetchTeeTimes(c.provider_id, newDate.toISOString().split('T')[0], teeTimeFilters);
                                            }
                                          }}
                                        >
                                          <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        </button>
                                      </div>
                                      {/* Compact waitlist form */}
                                      <div className="space-y-1">
                                        <p className="text-[9px] text-[var(--color-ink-gray)]">Join waitlist to get notified</p>
                                        {/* Name and Email row */}
                                        <div className="grid grid-cols-2 gap-1">
                                          <input
                                            type="text"
                                            value={waitlistData.name}
                                            onChange={(e) => setWaitlistData(prev => ({ ...prev, name: e.target.value }))}
                                            className="px-1.5 py-1 text-[10px] border border-gray-300 rounded text-gray-800"
                                            placeholder="Name"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                          <input
                                            type="email"
                                            value={waitlistData.email}
                                            onChange={(e) => setWaitlistData(prev => ({ ...prev, email: e.target.value }))}
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
                                            value={waitlistData.phone}
                                            onChange={(e) => setWaitlistData(prev => ({ ...prev, phone: e.target.value }))}
                                            className="px-1.5 py-1 text-[10px] border border-gray-300 rounded text-gray-800"
                                            placeholder="Phone (optional)"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                          {/* Time Range */}
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="time"
                                              value={waitlistData.timeStart}
                                              onChange={(e) => setWaitlistData(prev => ({ ...prev, timeStart: e.target.value }))}
                                              className="flex-1 px-1 py-1 text-[10px] border border-gray-300 rounded text-gray-800"
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <span className="text-[8px] text-[var(--color-ink-gray)]">to</span>
                                            <input
                                              type="time"
                                              value={waitlistData.timeEnd}
                                              onChange={(e) => setWaitlistData(prev => ({ ...prev, timeEnd: e.target.value }))}
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
                                              if (c.provider_id) handleWaitlistSubmit(c.id, c.provider_id);
                                            }}
                                            disabled={!waitlistData.email}
                                          >
                                            Join Waitlist
                                          </button>
                                          {c.website && (
                                            <button
                                              className="px-2 py-1 bg-white border border-gray-300 text-[var(--color-ink-black)] rounded text-[10px] font-medium hover:bg-gray-50 transition"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(c.website!, '_blank');
                                              }}
                                            >
                                              Visit Website
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                /* No booking - just website button */
                                <div className="mt-2 w-full">
                                  {c.website && (
                                    <button
                                      className="w-full bg-[var(--color-primary-red)] text-white rounded text-[10px] font-semibold hover:opacity-90 transition cursor-pointer px-2 py-1.5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(c.website!, '_blank');
                                      }}
                                    >
                                      Visit Website
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* FULLSCREEN LAYOUT - Keep existing */
                          <>
                            {/* Course Image */}
                            <div 
                              className="relative bg-gradient-to-br from-[var(--color-accent-teal)] to-[var(--color-primary-red)] overflow-hidden rounded-t-[16px]"
                              style={{ height: '120px' }}
                            >
                              <img
                                src={`https://i.postimg.cc/dVhLc1DR/Generated-Image-October-16-2025-3-01-PM.png`}
                                alt={c.name}
                                className="w-full h-full object-cover"
                              />
                              {c.verified && (
                                <img
                                  src="https://i.postimg.cc/WbqRWDPb/verfied-badge.png"
                                  alt="Golf.AI Verified"
                                  className="absolute top-0 left-2 w-11 h-14 drop-shadow-lg"
                                />
                              )}
                              <button
                                className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-all group"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectCourse(c.id);
                                }}
                                aria-label="Close"
                              >
                                <svg className="w-4 h-4 text-[var(--color-ink-black)] group-hover:text-[var(--color-primary-red)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              {typeof c.distance === "number" && (
                                <div className={`absolute bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-black font-semibold ${
                                  c.verified ? 'top-16 left-2' : 'top-2 right-2'
                                }`}>
                                  {c.distance} mi
                                </div>
                              )}
                            </div>

                            {/* Course Info */}
                            <div className="p-3 text-left">
                          {/* Header with No Tee Times message if applicable */}
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg text-[var(--color-ink-black)] mb-1 line-clamp-1">
                                {c.name}
                              </h3>
                              <p className="text-[var(--color-ink-gray)] text-xs mb-2">
                                {c.city}{c.state ? `, ${c.state}` : ""}
                              </p>
                            </div>
                            
                            {/* No Tee Times Badge - Top Right */}
                            {(c.provider === 'teebox' || c.provider === 'teefox') && c.provider_id && teeTimesData?.teetimes && teeTimesData.teetimes.length === 0 && !waitlistSuccess && (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-md">
                                  <svg className="w-3.5 h-3.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="font-semibold text-xs text-orange-700 whitespace-nowrap">No Tee Times</span>
                                </div>
                                {c.website && (
                                  <button
                                    className="px-2.5 py-1 bg-white border border-gray-300 text-[var(--color-ink-black)] rounded-md text-xs font-medium hover:bg-gray-50 transition whitespace-nowrap"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(c.website!, '_blank');
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
                            {c.type && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-bg-cream)] text-black font-medium capitalize text-xs">
                                {c.type}
                              </span>
                            )}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-bg-cream)] text-black font-medium text-xs">
                              18 holes
                            </span>
                            {c.verified && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] font-bold text-xs">
                                VERIFIED
                              </span>
                            )}
                          </div>

                          {/* Tee Times Section - Only for TeeBox providers */}
                          {(c.provider === 'teebox' || c.provider === 'teefox') && c.provider_id && (
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
                                    <div className="flex items-center justify-between gap-2">
                                      <button
                                        className="p-1 hover:bg-gray-100 rounded transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                        disabled={!!(selectedDate && selectedDate.toDateString() === new Date().toDateString())}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (selectedDate) {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const selected = new Date(selectedDate);
                                            selected.setHours(0, 0, 0, 0);
                                            
                                            if (selected > today) {
                                              const newDate = new Date(selectedDate);
                                              newDate.setDate(newDate.getDate() - 1);
                                              setSelectedDate(newDate);
                                              if (c.provider_id) {
                                                fetchTeeTimes(c.provider_id, newDate.toISOString().split('T')[0], {
                                                  patrons: teeTimeFilters.patrons,
                                                  holes: teeTimeFilters.holes,
                                                });
                                              }
                                            }
                                          }
                                        }}
                                      >
                                        <svg className="w-4 h-4 text-[var(--color-ink-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                      </button>
                                      <span className="text-sm font-semibold text-[var(--color-ink-black)]">
                                        {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                      </span>
                                      <button
                                        className="p-1 hover:bg-gray-100 rounded transition"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (selectedDate) {
                                            const newDate = new Date(selectedDate);
                                            newDate.setDate(newDate.getDate() + 1);
                                            setSelectedDate(newDate);
                                            if (c.provider_id) {
                                              fetchTeeTimes(c.provider_id, newDate.toISOString().split('T')[0], {
                                                patrons: teeTimeFilters.patrons,
                                                holes: teeTimeFilters.holes,
                                              });
                                            }
                                          }
                                        }}
                                      >
                                        <svg className="w-4 h-4 text-[var(--color-ink-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                      </button>
                                    </div>

                                    {/* Filter Controls */}
                                    <div className="flex items-center gap-2 text-xs">
                                      {/* Players Dropdown */}
                                      <div className="relative flex items-center gap-1 px-2 py-1 bg-[var(--color-bg-cream)] rounded-md">
                                        <svg className="w-3.5 h-3.5 text-[var(--color-ink-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <select
                                          className="bg-transparent text-[var(--color-ink-black)] font-medium outline-none cursor-pointer appearance-none pr-4"
                                          style={{
                                            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")',
                                            backgroundPosition: 'right center',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundSize: '1.25rem'
                                          }}
                                          value={teeTimeFilters.patrons}
                                          onChange={(e) => {
                                            const newPatrons = parseInt(e.target.value);
                                            setTeeTimeFilters(prev => ({ ...prev, patrons: newPatrons }));
                                            if (c.provider_id && selectedDate) {
                                              fetchTeeTimes(c.provider_id, selectedDate.toISOString().split('T')[0], {
                                                patrons: newPatrons,
                                                holes: teeTimeFilters.holes,
                                              });
                                            }
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <option value="1">1 player</option>
                                          <option value="2">2 players</option>
                                          <option value="3">3 players</option>
                                          <option value="4">4 players</option>
                                        </select>
                                      </div>

                                      {/* Holes Dropdown */}
                                      <div className="relative flex items-center gap-1 px-2 py-1 bg-[var(--color-bg-cream)] rounded-md">
                                        <svg className="w-3.5 h-3.5 text-[var(--color-ink-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                        </svg>
                                        <select
                                          className="bg-transparent text-[var(--color-ink-black)] font-medium outline-none cursor-pointer appearance-none pr-4"
                                          style={{
                                            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")',
                                            backgroundPosition: 'right center',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundSize: '1.25rem'
                                          }}
                                          value={teeTimeFilters.holes}
                                          onChange={(e) => {
                                            const newHoles = parseInt(e.target.value);
                                            setTeeTimeFilters(prev => ({ ...prev, holes: newHoles }));
                                            if (c.provider_id && selectedDate) {
                                              fetchTeeTimes(c.provider_id, selectedDate.toISOString().split('T')[0], {
                                                patrons: teeTimeFilters.patrons,
                                                holes: newHoles,
                                              });
                                            }
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <option value="9">9 holes</option>
                                          <option value="18">18 holes</option>
                                        </select>
                                      </div>

                                      {/* Price Range Display */}
                                      <div className="flex items-center gap-1 px-2 py-1 bg-[var(--color-bg-cream)] rounded-md text-[var(--color-ink-gray)]">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium text-[var(--color-ink-black)]">
                                          {(() => {
                                            const minPrice = Math.min(...teeTimesData.teetimes.map(t => t.pricePerPatron / 100));
                                            const maxPrice = Math.max(...teeTimesData.teetimes.map(t => t.pricePerPatron / 100));
                                            
                                            if (minPrice === 0 && maxPrice === 0) {
                                              return 'Variable Pricing';
                                            } else if (minPrice === 0) {
                                              return `Up to $${maxPrice} per player`;
                                            } else {
                                              return `$${minPrice} - $${maxPrice} per player`;
                                            }
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Tee Times Grid - Scrollable */}
                                  <div className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto pr-1 pb-2"
                                    style={{
                                      scrollbarWidth: 'thin',
                                      scrollbarColor: '#CBD5E0 transparent'
                                    }}
                                  >
                                    {teeTimesData.teetimes.map((teeTime: TeeTime, idx: number) => {
                                      // Parse the time in the course's timezone
                                      const time = new Date(teeTime.apptTime);
                                      const timeStr = time.toLocaleTimeString('en-US', { 
                                        hour: 'numeric', 
                                        minute: '2-digit',
                                        hour12: true,
                                        timeZone: teeTime.timezone // Use the course's timezone
                                      });
                                      // Format price for tooltip
                                      const priceStr = teeTime.pricePerPatron 
                                        ? `$${(teeTime.pricePerPatron / 100).toFixed(2)} per person`
                                        : 'Price not available';
                                      return (
                                        <button
                                          key={idx}
                                          className="px-2 py-1.5 bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[var(--color-ink-black)] rounded-md text-xs font-medium transition-colors cursor-pointer"
                                          title={priceStr}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const url = teeTime.bookingUrl.startsWith('http') 
                                              ? teeTime.bookingUrl 
                                              : `https://${teeTime.bookingUrl}`;
                                            window.open(url, '_blank');
                                          }}
                                        >
                                          {timeStr}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              ) : teeTimesData.teetimes && teeTimesData.teetimes.length === 0 ? (
                                /* No Tee Times Available - Show Date Selector + Message + Waitlist Form */
                                waitlistSuccess ? (
                                  /* Success Message */
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
                                        We'll notify you at <span className="font-medium text-[var(--color-ink-black)]">{waitlistData.email}</span> when a tee time becomes available.
                                      </p>
                                    </div>
                                    <button
                                      className="px-4 py-2 text-sm font-medium text-[var(--color-primary-red)] hover:bg-red-50 rounded-lg transition"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setWaitlistSuccess(false);
                                      }}
                                    >
                                      Close
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    {/* Date Navigation - Same as with tee times */}
                                    <div className="mb-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <button
                                          className="p-1 hover:bg-gray-100 rounded transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                          disabled={!!(selectedDate && selectedDate.toDateString() === new Date().toDateString())}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (selectedDate) {
                                              const today = new Date();
                                              today.setHours(0, 0, 0, 0);
                                              const selected = new Date(selectedDate);
                                              selected.setHours(0, 0, 0, 0);
                                              
                                              if (selected > today) {
                                                const newDate = new Date(selectedDate);
                                                newDate.setDate(newDate.getDate() - 1);
                                                setSelectedDate(newDate);
                                                if (c.provider_id) {
                                                  fetchTeeTimes(c.provider_id, newDate.toISOString().split('T')[0], {
                                                    patrons: teeTimeFilters.patrons,
                                                    holes: teeTimeFilters.holes,
                                                  });
                                                }
                                              }
                                            }
                                          }}
                                        >
                                          <svg className="w-4 h-4 text-[var(--color-ink-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                          </svg>
                                        </button>
                                        <span className="text-sm font-semibold text-[var(--color-ink-black)]">
                                          {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                        <button
                                          className="p-1 hover:bg-gray-100 rounded transition"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (selectedDate) {
                                              const newDate = new Date(selectedDate);
                                              newDate.setDate(newDate.getDate() + 1);
                                              setSelectedDate(newDate);
                                              if (c.provider_id) {
                                                fetchTeeTimes(c.provider_id, newDate.toISOString().split('T')[0], {
                                                  patrons: teeTimeFilters.patrons,
                                                  holes: teeTimeFilters.holes,
                                                });
                                              }
                                            }
                                          }}
                                        >
                                          <svg className="w-4 h-4 text-[var(--color-ink-gray)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Waitlist Form - Improved Hierarchy */}
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
                                            value={waitlistData.name}
                                            disabled
                                            className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded text-[var(--color-ink-gray)] cursor-not-allowed"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-[var(--color-ink-gray)] mb-1">Email</label>
                                          <input
                                            type="email"
                                            value={waitlistData.email}
                                            onChange={(e) => setWaitlistData(prev => ({ ...prev, email: e.target.value }))}
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
                                            value={waitlistData.phone}
                                            onChange={(value) => setWaitlistData(prev => ({ ...prev, phone: value || '' }))}
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
                                              value={waitlistData.timeStart}
                                              onChange={(e) => setWaitlistData(prev => ({ ...prev, timeStart: e.target.value }))}
                                              className="flex-1 px-2 py-2 text-xs border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-red)] focus:border-transparent"
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <span className="text-[var(--color-ink-gray)] text-[10px] font-medium">to</span>
                                            <input
                                              type="time"
                                              value={waitlistData.timeEnd}
                                              onChange={(e) => setWaitlistData(prev => ({ ...prev, timeEnd: e.target.value }))}
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
                                          if (c.provider_id) {
                                            handleWaitlistSubmit(c.id, c.provider_id);
                                          }
                                        }}
                                        disabled={waitlistSubmitting || !waitlistData.email}
                                      >
                                        {waitlistSubmitting ? 'Joining...' : 'Join Waitlist'}
                                      </button>
                                    </div>
                                  </>
                                )
                              ) : null}
                            </div>
                          )}

                          {/* Action Button - Only show if no TeeBox provider */}
                          {(!c.provider || c.provider !== 'teebox') && (
                            <button
                              className="w-full bg-[var(--color-primary-red)] text-white rounded-[8px] font-medium hover:opacity-90 transition cursor-pointer px-3 py-2 text-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (c.website) {
                                  window.open(c.website, '_blank');
                                } else {
                                  onBook();
                                }
                              }}
                            >
                              {c.website ? 'Visit Website' : 'Book Tee Time'}
                            </button>
                          )}
                        </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
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
