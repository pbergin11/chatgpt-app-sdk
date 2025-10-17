"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import BlocksWaveIcon from "./BlocksWaveIcon";

// Types for tool outputs we expect
type CoursePoint = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  type?: string;
  distance?: number;
  lon?: number;
  lat?: number;
  availability?: Array<{
    date: string;
    tee_times: Array<{
      time: string;
      available: boolean;
      price: number;
      players_available: number;
    }>;
  }>;
};

type GolfWidgetState = {
  __v: 1;
  viewport: { center: [number, number]; zoom: number };
  selectedCourseId?: string;
};

export default function GolfPage() {
  const toolOutput = useWidgetProps<{
    courses?: CoursePoint[];
    course?: { id: string; name: string; description?: string };
  }>();

  const [state, setState] = useWidgetState<GolfWidgetState>(() => ({
    __v: 1,
    viewport: { center: [-117.1611, 32.7157], zoom: 10 }, // default San Diego
  }));

  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight() ?? undefined;
  const requestDisplayMode = useRequestDisplayMode();
  const callTool = useCallTool();
  const userAgent = useUserAgent();
  const theme = useTheme();
  const locale = useLocale();
  const safeArea = useSafeArea();
  const toolInput = useToolInput();
  const toolOutputFromHook = useToolOutput();
  const toolResponseMetadata = useToolResponseMetadata();
  
  // Check if window.openai exists
  const hasOpenAI = typeof window !== 'undefined' && !!(window as any).openai;

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const [noToken, setNoToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Calculate availability for each course
  const coursesWithAvailability = useMemo(() => {
    return (toolOutput?.courses ?? [])
      .filter((c) => typeof c.lon === "number" && typeof c.lat === "number")
      .map((c) => {
        // Calculate total available slots
        const totalAvailable = c.availability?.reduce((sum, day) => 
          sum + day.tee_times.filter(slot => slot.available).length, 0
        ) ?? 0;
        
        const hasAvailability = totalAvailable > 0;
        
        return {
          ...c,
          totalAvailable,
          hasAvailability,
        };
      });
  }, [toolOutput?.courses]);

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
    if (!mapContainer.current) return;
    if (mapRef.current) return; // init once

    if (!token) {
      setNoToken(true);
      return;
    }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: state?.viewport?.center ?? [-117.1611, 32.7157],
      zoom: state?.viewport?.zoom ?? 10,
    });
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
      // Map is ready, markers will be added via separate effect
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setState, token]);

  // Add custom markers when courses change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    coursesWithAvailability.forEach((course) => {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      
      // Determine color based on availability
      const color = course.hasAvailability ? '#22c55e' : '#ef4444';
      
      // Check if this is a highly available course (top 30% of available slots)
      const maxAvailable = Math.max(...coursesWithAvailability.map(c => c.totalAvailable));
      const isHighlyAvailable = course.totalAvailable > maxAvailable * 0.7;
      
      // Create marker HTML with teardrop shape
      el.innerHTML = `
        <div style="
          position: relative;
          width: 30px;
          height: 30px;
          background-color: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s;
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
      
      // Add hover effect
      el.addEventListener('mouseenter', () => {
        const markerDiv = el.querySelector('div') as HTMLElement;
        if (markerDiv) markerDiv.style.transform = 'rotate(-45deg) scale(1.2)';
      });
      el.addEventListener('mouseleave', () => {
        const markerDiv = el.querySelector('div') as HTMLElement;
        if (markerDiv) markerDiv.style.transform = 'rotate(-45deg) scale(1)';
      });
      
      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([course.lon!, course.lat!])
        .addTo(map);
      
      // Add click handler
      el.addEventListener('click', () => {
        setState((prev) => ({ 
          ...(prev ?? { __v: 1, viewport: { center: [-117.1611, 32.7157], zoom: 10 } }), 
          selectedCourseId: course.id 
        }));
      });
      
      markersRef.current.push(marker);
    });

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [coursesWithAvailability, setState]);

  const selectedCourse = useMemo(() => {
    const id = state?.selectedCourseId;
    return (toolOutput?.courses ?? []).find((c) => c.id === id) ?? null;
  }, [state?.selectedCourseId, toolOutput?.courses]);

  const onSelectCourse = (id: string) => {
    setState((prev) => ({ ...(prev ?? { __v: 1, viewport: { center: [-117.1611, 32.7157], zoom: 10 } }), selectedCourseId: id }));
    // Fetch details via MCP
    callTool && callTool("get_course_details", { courseId: id });
  };

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
        ) : (
          <div ref={mapContainer} className="h-full w-full" />
        )}
      </div>

      {/* Top Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
        {/* Debug Widget */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-[var(--color-ui-line)] px-3 py-2 text-xs text-black shadow-lg font-mono max-h-[80vh] overflow-y-auto">
          <div className="font-bold mb-2 text-[var(--color-primary-red)] text-sm">SDK Debug Info</div>
          
          {/* Connection Status */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <div className="font-semibold text-[var(--color-accent-teal)] mb-1">Connection</div>
            <div><span className="text-[var(--color-ink-gray)]">window.openai:</span> <span className="font-semibold">{hasOpenAI ? '✓ exists' : '✗ missing'}</span></div>
          </div>
          
          {/* Layout Properties */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <div className="font-semibold text-[var(--color-accent-teal)] mb-1">Layout</div>
            <div><span className="text-[var(--color-ink-gray)]">displayMode:</span> <span className="font-semibold">{displayMode ?? 'undefined'}</span></div>
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
          </div>
        </div>
        
        <button
          className="bg-white rounded-full border border-[var(--color-ui-line)] px-4 py-2 text-sm text-black font-medium shadow-lg hover:shadow-xl transition"
          onClick={() => requestDisplayMode("fullscreen")}
          aria-label="Enter fullscreen"
        >
          Fullscreen
        </button>
      </div>

      {/* Bottom Course Cards */}
      {toolOutput?.courses?.length ? (
        <div className="absolute bottom-0 left-0 right-0 z-10 pb-4">
          <div className="overflow-x-auto overflow-y-visible px-4 pb-2 scrollbar-hide">
            <div className="flex gap-3 min-w-min py-2">
              {toolOutput.courses.map((c) => (
                <button
                  key={c.id}
                  className={`flex-shrink-0 bg-white rounded-[20px] shadow-[var(--shadow-card)] hover:shadow-xl transition-all hover:translate-y-[-2px] ${
                    state?.selectedCourseId === c.id ? "ring-2 ring-[var(--color-accent-teal)]" : ""
                  }`}
                  style={{ width: `${cardWidth}px` }}
                  onClick={() => onSelectCourse(c.id)}
                >
                  {/* Course Image */}
                  <div 
                    className="relative bg-gradient-to-br from-[var(--color-accent-teal)] to-[var(--color-primary-red)] overflow-hidden rounded-t-[20px]"
                    style={{ height: `${cardImageHeight}px` }}
                  >
                    <img
                      src={`https://i.postimg.cc/dVhLc1DR/Generated-Image-October-16-2025-3-01-PM.png`}
                      alt={c.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Distance Badge */}
                    {typeof c.distance === "number" && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-black font-semibold">
                        {c.distance} mi
                      </div>
                    )}
                  </div>

                  {/* Course Info */}
                  <div className="p-3 text-left" style={{ padding: cardWidth < 200 ? '12px' : '16px' }}>
                    <h3 
                      className="font-bold text-[var(--color-ink-black)] mb-1 line-clamp-1"
                      style={{ fontSize: cardWidth < 200 ? '14px' : '16px' }}
                    >
                      {c.name}
                    </h3>
                    <p 
                      className="text-[var(--color-ink-gray)] mb-2"
                      style={{ fontSize: cardWidth < 200 ? '11px' : '12px' }}
                    >
                      {c.city}{c.state ? `, ${c.state}` : ""}
                    </p>

                    {/* Tags */}
                    <div className="flex gap-1.5 mb-2" style={{ marginBottom: cardWidth < 200 ? '8px' : '12px' }}>
                      {c.type && (
                        <span 
                          className="inline-flex items-center px-2 py-1 rounded-md bg-[var(--color-bg-cream)] text-black font-medium capitalize"
                          style={{ fontSize: cardWidth < 200 ? '10px' : '12px' }}
                        >
                          {c.type}
                        </span>
                      )}
                      <span 
                        className="inline-flex items-center px-2 py-1 rounded-md bg-[var(--color-bg-cream)] text-black font-medium"
                        style={{ fontSize: cardWidth < 200 ? '10px' : '12px' }}
                      >
                        18 holes
                      </span>
                    </div>

                    {/* Action Button */}
                    <button
                      className="w-full bg-[var(--color-primary-red)] text-white rounded-[8px] font-medium hover:opacity-70 transition cursor-pointer"
                      style={{ 
                        padding: cardWidth < 200 ? '6px 12px' : '8px 16px',
                        fontSize: cardWidth < 200 ? '12px' : '14px'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onBook();
                      }}
                    >
                      Book Tee Time
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-white rounded-[20px] px-6 py-4 shadow-lg text-center">
            <div className="flex items-center gap-3">
              <BlocksWaveIcon size={32} color="var(--color-accent-teal)" />
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
