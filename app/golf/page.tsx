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

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const [noToken, setNoToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const geojson = useMemo(() => {
    const features = (toolOutput?.courses ?? [])
      .filter((c) => typeof c.lon === "number" && typeof c.lat === "number")
      .map((c) => ({
        type: "Feature" as const,
        properties: { id: c.id, name: c.name },
        geometry: { type: "Point" as const, coordinates: [c.lon!, c.lat!] as [number, number] },
      }));
    return { type: "FeatureCollection" as const, features };
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
      // Add clustered source
      if (!map.getSource("courses")) {
        map.addSource("courses", {
          type: "geojson",
          data: geojson as any,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // Cluster circles
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "courses",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#007F7B", // accent teal
            "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 30, 26],
          },
        });
        // Cluster count
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "courses",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 12,
          },
          paint: { "text-color": "#F6F2E8" }, // cream
        });
        // Unclustered points
        map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: "courses",
          filter: ["!has", "point_count"],
          paint: {
            "circle-color": "#D54B3D", // primary red
            "circle-radius": 6,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#FFFFFF",
          },
        });

        // Zoom in on cluster
        map.on("click", "clusters", (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
          const clusterId = features[0].properties?.cluster_id;
          const source = map.getSource("courses") as mapboxgl.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || zoom === null || zoom === undefined) return;
            const [lng, lat] = (features[0].geometry as any).coordinates;
            map.easeTo({ center: [lng, lat], zoom });
          });
        });

        // Select a course on point click
        map.on("click", "unclustered-point", (e) => {
          const feat = map.queryRenderedFeatures(e.point, { layers: ["unclustered-point"] })[0];
          const id = feat?.properties?.id as string | undefined;
          if (id) {
            setState((prev) => ({ ...(prev ?? { __v: 1, viewport: { center: [-117.1611, 32.7157], zoom: 10 } }), selectedCourseId: id }));
          }
        });

        map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));
        map.on("mouseenter", "unclustered-point", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "unclustered-point", () => (map.getCanvas().style.cursor = ""));
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [geojson, setState, token]);

  // Update source data when courses change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("courses") as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(geojson as any);
  }, [geojson]);

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
      <div className="absolute top-4 right-4 z-10">
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
      ) : isLoading ? (
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
      ) : null}

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
