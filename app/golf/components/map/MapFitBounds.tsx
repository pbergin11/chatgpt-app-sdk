"use client";
import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import type { CourseWithAvailability } from '../../types';

type MapFitBoundsProps = {
  map: mapboxgl.Map | null;
  courses: CourseWithAvailability[];
  safeAreaBottom?: number;
};

export function MapFitBounds({ map, courses, safeAreaBottom = 0 }: MapFitBoundsProps) {
  useEffect(() => {
    if (!map) return;

    const doFit = () => {
      const pts = (courses ?? []).filter(c => typeof c.lon === 'number' && typeof c.lat === 'number');
      if (pts.length === 0) return;
      const bottomPad = safeAreaBottom + 180;
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
  }, [courses, safeAreaBottom, map]);

  return null;
}
