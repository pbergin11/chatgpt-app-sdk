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
  matched_date?: string;
  available_on_date?: boolean;
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
    searchContext?: { matched_date?: string | null };
  }>();

  const [state, setState] = useWidgetState<GolfWidgetState>(() => ({
    __v: 1,
    viewport: { center: [-117.1611, 32.7157], zoom: 10 }, // default San Diego
  }));

  const displayMode = useDisplayMode();
  const rawMaxHeight = useMaxHeight() ?? undefined;
  const requestDisplayMode = useRequestDisplayMode();
  const callTool = useCallTool();
  const userAgent = useUserAgent();
  
  // Cap maxHeight at 750px for mobile inline mode to prevent infinite growth
  const maxHeight = useMemo(() => {
    const isMobile = userAgent?.device?.type === 'mobile';
    if (isMobile && displayMode === 'inline' && rawMaxHeight) {
      return Math.min(rawMaxHeight, 750);
    }
    return rawMaxHeight;
  }, [rawMaxHeight, displayMode, userAgent?.device?.type]);
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
    const matchedDate = toolOutput?.searchContext?.matched_date ?? undefined;
    return (toolOutput?.courses ?? [])
      .filter((c) => typeof c.lon === "number" && typeof c.lat === "number")
      .map((c) => {
        const totalAvailable = c.availability?.reduce((sum, day) =>
          sum + day.tee_times.filter(slot => slot.available).length, 0
        ) ?? 0;
        const onDateAvailableSlots = matchedDate
          ? (c.availability?.find(d => d.date === matchedDate)?.tee_times.filter(t => t.available).length ?? 0)
          : undefined;
        const hasAvailability = matchedDate ? (c.available_on_date ?? false) : totalAvailable > 0;
        const availabilityScore = matchedDate ? (onDateAvailableSlots ?? 0) : totalAvailable;
        return {
          ...c,
          totalAvailable,
          hasAvailability,
          onDateAvailableSlots,
          availabilityScore,
        };
      });
  }, [toolOutput?.courses, toolOutput?.searchContext?.matched_date]);

  const maxAvailabilityScore = useMemo(() => {
    const scores = (coursesWithAvailability ?? []).map((c: any) => c?.availabilityScore ?? 0);
    const m = Math.max(0, ...scores);
    return Number.isFinite(m) ? m : 0;
  }, [coursesWithAvailability]);

  const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const hexToRgb = (h: string) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
  const rgbToHex = (r: number, g: number, b: number) => `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  const colorBetween = (from: string, to: string, t: number) => {
    const A = hexToRgb(from); const B = hexToRgb(to);
    return rgbToHex(mix(A.r, B.r, t), mix(A.g, B.g, t), mix(A.b, B.b, t));
  };
  const getMarkerColor = (c: any) => {
    const score = c?.availabilityScore ?? 0;
    const max = maxAvailabilityScore || 0;
    const t = max > 0 ? Math.min(1, Math.max(0, score / max)) : 0;
    return colorBetween('#ef4444', '#22c55e', t);
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
    if (!mapContainer.current) return;
    if (mapRef.current) return; // init once

    if (!token) {
      setNoToken(true);
      return;
    }
    mapboxgl.accessToken = token;

    // If we already have course points, start the map with their bounds so the first frame is correct
    const initPts = (coursesWithAvailability ?? []).filter(c => typeof c.lon === 'number' && typeof c.lat === 'number');
    const bottomPad = (safeArea?.insets?.bottom ?? 0) + 180;
    const baseOptions: mapboxgl.MapboxOptions = {
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
    };
    const map = new mapboxgl.Map(
      initPts.length > 0
        ? {
            ...baseOptions,
            bounds:
              initPts.length === 1
                ? new mapboxgl.LngLatBounds(
                    [initPts[0].lon! - 0.01, initPts[0].lat! - 0.01],
                    [initPts[0].lon! + 0.01, initPts[0].lat! + 0.01]
                  )
                : initPts.reduce((b, p, i) => {
                    if (i === 0) return new mapboxgl.LngLatBounds([p.lon!, p.lat!], [p.lon!, p.lat!]);
                    return b.extend([p.lon!, p.lat!]);
                  }, new mapboxgl.LngLatBounds([initPts[0].lon!, initPts[0].lat!], [initPts[0].lon!, initPts[0].lat!])),
            fitBoundsOptions: { padding: { top: 40, right: 40, bottom: bottomPad, left: 40 }, maxZoom: 13 },
          }
        : {
            ...baseOptions,
            center: state?.viewport?.center ?? [-117.1611, 32.7157],
            zoom: state?.viewport?.zoom ?? 10,
          }
    );
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
      // Ensure internal size is correct in case container changed
      map.resize();
      // Markers and bounds fitting are handled in separate effects (and also scheduled on load)
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setState, token]);

  // Add custom markers when courses change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addMarkers = () => {
      // Remove existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Add new markers
      coursesWithAvailability.forEach((course) => {
        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'custom-marker';
        
        const color = getMarkerColor(course);
        
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

  const selectedCourse = useMemo(() => {
    const id = state?.selectedCourseId;
    return (coursesWithAvailability ?? []).find((c) => c.id === id) ?? null;
  }, [state?.selectedCourseId, coursesWithAvailability]);

  const onSelectCourse = (id: string) => {
    // If clicking the same course, deselect it (especially useful on mobile)
    if (state?.selectedCourseId === id) {
      setState((prev) => ({ ...(prev ?? { __v: 1, viewport: { center: [-117.1611, 32.7157], zoom: 10 } }), selectedCourseId: undefined }));
    } else {
      setState((prev) => ({ ...(prev ?? { __v: 1, viewport: { center: [-117.1611, 32.7157], zoom: 10 } }), selectedCourseId: id }));
      // Fetch details via MCP
      callTool && callTool("get_course_details", { courseId: id });
    }
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
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-stretch w-[280px] pointer-events-none">
        {/* Debug Widget */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-[var(--color-ui-line)] shadow-lg pointer-events-auto">
          {/* Display Mode Toggle Button at Top */}
          <button
            className="w-full bg-[var(--color-primary-red)] text-white rounded-t-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition"
            onClick={() => requestDisplayMode(displayMode === "fullscreen" ? "inline" : "fullscreen")}
            aria-label={displayMode === "fullscreen" ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {displayMode === "fullscreen" ? "Inline" : "Fullscreen"}
          </button>
          
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
              <div><span className="text-[var(--color-ink-gray)]">selectedCourseColor:</span> <span className="font-semibold">{selectedCourse ? getMarkerColor(selectedCourse as any) : 'N/A'}</span></div>
            </div>
          </div>
        </div>
      </div>

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
                return (
                  <button
                    key={c.id}
                    className={`flex-shrink-0 bg-white rounded-[16px] shadow-[var(--shadow-card)] hover:shadow-xl transition-all duration-300 ease-out ${
                      isSelected 
                        ? "" 
                        : "hover:translate-y-[-2px]"
                    } ${dimForNoAvail ? "opacity-60" : ""}`}
                    style={{ 
                      width: isSelected ? '320px' : '280px',
                      transformOrigin: 'bottom center'
                    }}
                    onClick={() => onSelectCourse(c.id)}
                  >
                    {/* Compact Layout (Not Selected) */}
                    {!isSelected ? (
                      <div className="flex items-center gap-3 p-3">
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
                          <div className="flex items-center gap-2 text-xs">
                            {typeof c.distance === "number" && (
                              <span className="text-[var(--color-ink-gray)]">
                                {c.distance} mi
                              </span>
                            )}
                            {c.type && (
                              <>
                                <span className="text-[var(--color-ink-gray)]">•</span>
                                <span className="text-[var(--color-ink-gray)] capitalize">{c.type}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Expanded Layout (Selected) */
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
                          {/* Distance Badge */}
                          {typeof c.distance === "number" && (
                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-black font-semibold">
                              {c.distance} mi
                            </div>
                          )}
                        </div>

                        {/* Course Info */}
                        <div className="p-3 text-left">
                          <h3 className="font-bold text-[var(--color-ink-black)] text-base mb-1 line-clamp-1">
                            {c.name}
                          </h3>
                          <p className="text-[var(--color-ink-gray)] text-xs mb-2">
                            {c.city}{c.state ? `, ${c.state}` : ""}
                          </p>

                          {/* Tags */}
                          <div className="flex gap-1.5 mb-2">
                            {c.type && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-bg-cream)] text-black font-medium capitalize text-xs">
                                {c.type}
                              </span>
                            )}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-bg-cream)] text-black font-medium text-xs">
                              18 holes
                            </span>
                          </div>

                          {/* Action Button */}
                          <button
                            className="w-full bg-[var(--color-primary-red)] text-white rounded-[8px] px-3 py-2 text-sm font-medium hover:opacity-90 transition cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onBook();
                            }}
                          >
                            Book Tee Time
                          </button>
                        </div>
                      </>
                    )}
                  </button>
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
