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
} from "../hooks";

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

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const [noToken, setNoToken] = useState(false);

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
      center: state?.viewport.center ?? [-117.1611, 32.7157],
      zoom: state?.viewport.zoom ?? 10,
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
            setState((prev) => ({ ...(prev ?? { __v: 1, viewport: state!.viewport }), selectedCourseId: id }));
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
  }, [geojson, setState, state?.viewport, token]);

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
    setState((prev) => ({ ...(prev ?? { __v: 1, viewport: state!.viewport }), selectedCourseId: id }));
    // Fetch details via MCP
    callTool && callTool("get_course_details", { courseId: id });
  };

  const onBook = async () => {
    if (!state?.selectedCourseId) return;
    await callTool?.("book_tee_time", { courseId: state.selectedCourseId });
  };

  return (
    <div
      className="w-full h-screen"
      style={{ maxHeight, height: maxHeight ?? "100vh" }}
    >
      <div className="flex flex-col md:flex-row gap-0 h-full">
        {/* Sidebar */}
        <aside className="bg-[var(--color-bg-cream)] text-[var(--color-ink-black)] border-r border-[var(--color-ui-line)] p-4 md:p-6 overflow-auto w-full md:w-1/4 md:max-w-[360px] md:min-w-[280px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Golf Explorer</h2>
            <button
              className="rounded-full border px-3 py-1 text-sm"
              onClick={() => requestDisplayMode("fullscreen")}
              aria-label="Enter fullscreen"
            >
              Fullscreen
            </button>
          </div>

          {!toolOutput?.courses?.length ? (
            <div className="text-sm text-[var(--color-ink-gray)]">
              No courses loaded. Try calling <code>search_courses</code> from ChatGPT.
            </div>
          ) : (
            <ul className="space-y-2">
              {toolOutput.courses.map((c) => (
                <li key={c.id}>
                  <button
                    className={`w-full text-left bg-white rounded-[12px] border border-[var(--color-ui-line)] p-3 hover:translate-y-[-1px] transition will-change-transform ${
                      state?.selectedCourseId === c.id ? "ring-2 ring-[var(--color-accent-teal)]" : ""
                    }`}
                    onClick={() => onSelectCourse(c.id)}
                  >
                    <div className="text-sm font-semibold">{c.name}</div>
                    <div className="text-xs text-[var(--color-ink-gray)]">
                      {c.city ?? ""} {typeof c.distance === "number" ? `· ${c.distance} mi` : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Details panel */}
          {selectedCourse ? (
            <div className="mt-4 bg-white rounded-[12px] border border-[var(--color-ui-line)] p-4 shadow-[var(--shadow-card)]">
              <div className="text-base font-bold mb-1">{selectedCourse.name}</div>
              <div className="text-xs text-[var(--color-ink-gray)] mb-3">
                {selectedCourse.city ?? ""}
              </div>
              {toolOutput?.course?.id === selectedCourse.id && toolOutput?.course?.description ? (
                <p className="text-sm mb-3">{toolOutput.course.description}</p>
              ) : (
                <p className="text-sm mb-3 text-[var(--color-ink-gray)]">Fetching details…</p>
              )}
              <div className="flex gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-[8px] px-4 py-2 text-sm font-medium text-[var(--color-bg-cream)]"
                  style={{ background: "var(--color-primary-red)" }}
                  onClick={onBook}
                >
                  Book tee time
                </button>
                <a
                  className="inline-flex items-center justify-center rounded-[8px] px-3 py-2 text-sm border border-[var(--color-ui-line)]"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    callTool?.("get_course_details", { courseId: selectedCourse.id });
                  }}
                >
                  Refresh details
                </a>
              </div>
            </div>
          ) : null}
        </aside>

        {/* Map */}
        <section className="relative flex-1">
          {noToken ? (
            <div className="h-full w-full flex items-center justify-center text-sm text-[var(--color-ink-gray)] p-6">
              Mapbox token missing. Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in your environment to enable the map.
            </div>
          ) : (
            <div ref={mapContainer} className="h-full w-full" />
          )}
        </section>
      </div>
    </div>
  );
}
