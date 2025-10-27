"use client";
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { GolfWidgetState } from '../../types';
import { StaticMapFallback } from './StaticMapFallback';

type MapContainerProps = {
  token: string;
  noToken: boolean;
  noWebGL: boolean;
  workerReady: boolean;
  state: GolfWidgetState | null;
  setState: (updater: (prev: GolfWidgetState | null) => GolfWidgetState) => void;
  onMapReady: (map: mapboxgl.Map) => void;
  setNoToken: (value: boolean) => void;
  setNoWebGL: (value: boolean) => void;
};

export function MapContainer({
  token,
  noToken,
  noWebGL,
  workerReady,
  state,
  setState,
  onMapReady,
  setNoToken,
  setNoWebGL,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    console.log('🗺️ [Map Init Effect] Starting...', {
      hasToken: !!token,
      workerReady,
      hasSafeArea: true,
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
          onMapReady(map);
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
  }, [setState, token, workerReady, setNoToken, setNoWebGL, onMapReady]); // Removed 'state' dependency

  if (noToken) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm text-[var(--color-ink-gray)] p-6 bg-[var(--color-bg-cream)]">
        Mapbox token missing. Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in your environment to enable the map.
      </div>
    );
  }

  if (noWebGL) {
    return <StaticMapFallback token={token} center={state?.viewport?.center ?? [-117.1611, 32.7157]} zoom={state?.viewport?.zoom ?? 10} />;
  }

  return <div id="golf-map" ref={mapContainer} className="h-full w-full" />;
}
