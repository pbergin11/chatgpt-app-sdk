"use client";
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { CourseWithAvailability, GolfWidgetState } from '../../types';
import { getMarkerColor } from '../../utils';

type MapMarkersProps = {
  map: mapboxgl.Map | null;
  courses: CourseWithAvailability[];
  selectedCourseId?: string;
  onSelectCourse: (id: string) => void;
  state: GolfWidgetState | null;
};

export function MapMarkers({ map, courses, selectedCourseId, onSelectCourse, state }: MapMarkersProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const markerPopupsRef = useRef<Map<string, mapboxgl.Popup>>(new Map());
  const onSelectCourseRef = useRef(onSelectCourse);
  
  // Keep the ref updated with the latest callback
  useEffect(() => {
    onSelectCourseRef.current = onSelectCourse;
  }, [onSelectCourse]);

  // Add custom markers when courses change
  useEffect(() => {
    console.log('📍 [Markers Effect] Running...', { 
      hasMap: !!map, 
      coursesCount: courses?.length ?? 0 
    });
    if (!map) return;

    const addMarkers = () => {
      console.log('🎯 [Markers] Adding markers for', courses?.length ?? 0, 'courses');
      // Remove existing markers and popups
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      markerPopupsRef.current.clear();

      // Add new markers
      courses.forEach((course) => {
        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.dataset.courseId = course.id;
        
        const color = getMarkerColor(course);
        
        // Check if this is a highly available course (top 30% of available slots)
        // AND has good availability (normalized score > 0.6, which maps to green/yellow colors)
        const maxAvailable = Math.max(...courses.map(c => c.totalAvailable));
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
          onSelectCourseRef.current(course.id);
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
  }, [courses, map]); // Removed onSelectCourse and state to prevent marker recreation

  // Update popup visibility when selected course changes
  useEffect(() => {
    if (!map) return;

    markerPopupsRef.current.forEach((popup, courseId) => {
      const isSelected = selectedCourseId === courseId;
      
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
  }, [selectedCourseId, map]);

  return null;
}
