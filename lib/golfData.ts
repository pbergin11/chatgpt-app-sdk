/**
 * Golf Course Data Layer
 * 
 * This file handles all database queries for golf courses using Supabase.
 * It replaces the mock data with real database queries.
 */

import { supabase, type SupabaseCourse } from './supabase';
import { geocodeLocation } from './geocoding';

// Default course image (since we don't have images in DB yet)
const DEFAULT_COURSE_IMAGE = 'https://i.postimg.cc/9FLqXqYZ/golf-course-default.jpg';

// Transform Supabase course to frontend format
export interface GolfCourse {
  id: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  type: string;
  lon: number;
  lat: number;
  holes: number;
  par: number;
  yardage: number;
  average_price: number;
  rating_stars: number;
  amenities: string[];
  image_url: string;
  phone?: string;
  email?: string;
  website?: string;
  verified: boolean;
  // Full data for detail view
  data?: any;
}

function transformCourse(course: SupabaseCourse): GolfCourse {
  // Calculate average price
  const walkMin = parseFloat(course.walk_rate_min || '0');
  const walkMax = parseFloat(course.walk_rate_max || '0');
  const averagePrice = walkMin > 0 && walkMax > 0 ? (walkMin + walkMax) / 2 : walkMin || walkMax || 0;

  return {
    id: course.id,
    name: course.course_name,
    city: course.city,
    state: course.state || undefined,
    country: course.country,
    type: course.type,
    lon: course.lon,
    lat: course.lat,
    holes: course.holes || 18,
    par: course.par_total || 72,
    yardage: course.yardage_total || 0,
    average_price: averagePrice,
    rating_stars: course.verified ? 4.5 : 4.0, // Default rating (can be enhanced later)
    amenities: course.amenities || [],
    image_url: DEFAULT_COURSE_IMAGE,
    phone: course.phone || undefined,
    email: course.email || undefined,
    website: course.website || undefined,
    verified: course.verified,
    data: course.data,
  };
}

/**
 * Search courses by location
 * Supports:
 * - State-only (USA): searchCoursesByArea(undefined, 'CA', undefined)
 * - Country-only: searchCoursesByArea(undefined, undefined, 'Australia')
 * - City + State (USA): searchCoursesByArea('San Diego', 'CA', undefined)
 * - City + Country (International): searchCoursesByArea('Sydney', undefined, 'Australia')
 * - Radius search: Uses geocoding + PostGIS for courses within radius
 */
export async function searchCoursesByArea(
  city?: string,
  state?: string,
  country?: string,
  radius?: number,
  filters?: Record<string, any>
): Promise<GolfCourse[]> {
  try {
    let query = supabase
      .from('golf_courses')
      .select('*')
      .eq('status', 'open');

    // Determine if we need geospatial search
    let useGeospatial = false;
    let centerLat: number | undefined;
    let centerLon: number | undefined;

    // Location filtering strategy:
    // 1. If city is provided, try geocoding + radius search (catches nearby courses)
    // 2. Otherwise, use exact state/country match
    if (city && radius && radius > 0) {
      // Geocode the location to get center point
      const geocoded = await geocodeLocation(city, state, country);
      if (geocoded) {
        useGeospatial = true;
        centerLat = geocoded.lat;
        centerLon = geocoded.lon;
        console.log(`[Geocoding] ${city} → (${centerLat}, ${centerLon})`);
      }
    }

    if (useGeospatial && centerLat && centerLon && radius) {
      // Use PostGIS radius search
      // ST_DWithin uses meters, so convert miles to meters
      const radiusMeters = radius * 1609.34;
      
      // Use RPC function for geospatial query (more efficient)
      // Note: This requires a custom Postgres function - fallback to exact match if not available
      const { data: geoData, error: geoError } = await supabase.rpc('search_courses_within_radius', {
        search_lat: centerLat,
        search_lon: centerLon,
        radius_meters: radiusMeters,
      });

      if (geoError) {
        console.warn('Geospatial search failed, falling back to exact match:', geoError.message);
        // Fallback to exact city match
        query = query.ilike('city', `%${city}%`);
        if (state) query = query.eq('state', state.toUpperCase());
        if (country) query = query.eq('country', country);
      } else if (geoData) {
        // Use geospatial results - filter by IDs
        const courseIds = geoData.map((c: any) => c.id);
        if (courseIds.length === 0) {
          return []; // No courses found in radius
        }
        query = query.in('id', courseIds);
      }
    } else {
      // Exact location match (no radius)
      if (state && !city && !country) {
        // State-only search (USA)
        query = query.eq('state', state.toUpperCase());
      } else if (country && !city && !state) {
        // Country-only search
        query = query.eq('country', country);
      } else if (city) {
        // City search (with optional state/country)
        query = query.ilike('city', `%${city}%`);
        if (state) {
          query = query.eq('state', state.toUpperCase());
        }
        if (country) {
          query = query.eq('country', country);
        }
      }
    }

    // Apply filters
    if (filters) {
      // Type filter
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.types && Array.isArray(filters.types)) {
        query = query.in('type', filters.types);
      }

      // Holes filter
      if (filters.holes_in && Array.isArray(filters.holes_in)) {
        query = query.in('holes', filters.holes_in);
      }

      // Par filter
      if (filters.par_min) {
        query = query.gte('par_total', filters.par_min);
      }
      if (filters.par_max) {
        query = query.lte('par_total', filters.par_max);
      }

      // Yardage filter
      if (filters.yardage_min) {
        query = query.gte('yardage_total', filters.yardage_min);
      }
      if (filters.yardage_max) {
        query = query.lte('yardage_total', filters.yardage_max);
      }

      // Year built filter
      if (filters.year_built_min) {
        query = query.gte('year_opened', filters.year_built_min);
      }
      if (filters.year_built_max) {
        query = query.lte('year_opened', filters.year_built_max);
      }

      // Verified filter
      if (filters.verified) {
        query = query.eq('verified', true);
      }

      // Badge filters
      if (filters.top_public) {
        query = query.eq('top_public', true);
      }
      if (filters.best_in_state) {
        query = query.eq('best_in_state', true);
      }

      // Amenity filters - check if amenity exists in array
      const amenityFilters = [
        'driving_range',
        'club_rentals',
        'spa',
        'lodging',
        'pro_shop',
        'locker_rooms',
        'practice_putting_green',
        'coaching',
      ];

      for (const amenity of amenityFilters) {
        if (filters[amenity] === true) {
          query = query.contains('amenities', [amenity]);
        }
      }

      // Special handling for has_range (check multiple amenity names)
      if (filters.has_range === true) {
        query = query.or('amenities.cs.{driving_range},amenities.cs.{range}');
      }

      // Additional amenity filters
      if (filters.restaurant === true) {
        query = query.contains('amenities', ['restaurant']);
      }
      if (filters.bar === true) {
        query = query.contains('amenities', ['bar']);
      }
      if (filters.golf_lessons === true) {
        query = query.contains('amenities', ['lessons']);
      }
      if (filters.putting_green === true) {
        query = query.contains('amenities', ['practice_putting_green']);
      }
      if (filters.event_space === true) {
        query = query.contains('amenities', ['event_space']);
      }
      if (filters.practice_bunker === true) {
        query = query.contains('amenities', ['practice_bunker']);
      }
      if (filters.chipping_green === true) {
        query = query.contains('amenities', ['chipping_area']);
      }

      // Text search
      if (filters.search_text) {
        query = query.or(`course_name.ilike.%${filters.search_text}%,city.ilike.%${filters.search_text}%`);
      }
    }

    // Limit results
    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform to frontend format
    let courses = data.map(transformCourse);

    // Apply price filters (after transformation)
    if (filters?.max_price) {
      courses = courses.filter((c: GolfCourse) => c.average_price <= filters.max_price);
    }
    if (filters?.min_price) {
      courses = courses.filter((c: GolfCourse) => c.average_price >= filters.min_price);
    }

    // Sorting
    if (filters?.sort_by) {
      switch (filters.sort_by) {
        case 'cheapest':
          courses.sort((a: GolfCourse, b: GolfCourse) => a.average_price - b.average_price);
          break;
        case 'most_expensive':
          courses.sort((a: GolfCourse, b: GolfCourse) => b.average_price - a.average_price);
          break;
        case 'highest_rated':
          courses.sort((a: GolfCourse, b: GolfCourse) => b.rating_stars - a.rating_stars);
          break;
        case 'longest':
          courses.sort((a: GolfCourse, b: GolfCourse) => b.yardage - a.yardage);
          break;
        case 'shortest':
          courses.sort((a: GolfCourse, b: GolfCourse) => a.yardage - b.yardage);
          break;
        case 'newest':
          courses.sort((a: GolfCourse, b: GolfCourse) => {
            const aYear = (a.data?.golf?.courses?.[0]?.year_opened || 0);
            const bYear = (b.data?.golf?.courses?.[0]?.year_opened || 0);
            return bYear - aYear;
          });
          break;
        case 'oldest':
          courses.sort((a: GolfCourse, b: GolfCourse) => {
            const aYear = (a.data?.golf?.courses?.[0]?.year_opened || 9999);
            const bYear = (b.data?.golf?.courses?.[0]?.year_opened || 9999);
            return aYear - bYear;
          });
          break;
      }
    }

    return courses;
  } catch (error) {
    console.error('Error searching courses:', error);
    return [];
  }
}

/**
 * Find a specific course by ID or name
 */
export async function findCourse(
  courseId?: string,
  name?: string,
  state?: string,
  country?: string
): Promise<GolfCourse | null> {
  try {
    let query = supabase.from('golf_courses').select('*');

    if (courseId) {
      query = query.eq('id', courseId);
    } else if (name) {
      query = query.ilike('course_name', `%${name}%`);
      if (state) {
        query = query.eq('state', state.toUpperCase());
      }
      if (country) {
        query = query.eq('country', country);
      }
      query = query.limit(1);
    } else {
      return null;
    }

    const { data, error } = await query.single();

    if (error || !data) {
      console.error('Course not found:', error);
      return null;
    }

    return transformCourse(data);
  } catch (error) {
    console.error('Error finding course:', error);
    return null;
  }
}

/**
 * Check if a course has a driving range open on a specific date
 * This queries the JSONB data field for practice range hours
 */
export function checkRangeAvailability(course: GolfCourse, date: Date): boolean {
  if (!course.data?.golf?.practice?.range) {
    return false;
  }

  const range = course.data.golf.practice.range;
  
  // Check if range is available at all
  if (!range.available) {
    return false;
  }

  // Get day of week
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayName = dayNames[date.getDay()];

  // Check if range has hours for this day
  if (range.hours && range.hours[dayName]) {
    const hours = range.hours[dayName];
    // If hours exist and aren't empty, range is open
    return hours && hours.length > 0 && hours !== 'closed';
  }

  // If no specific hours, assume open if range is marked as available
  return true;
}

/**
 * Get location description for display
 */
export function getLocationDescription(city?: string, state?: string, country?: string): string {
  if (city && state) {
    return `${city}, ${state}`;
  } else if (city && country) {
    return `${city}, ${country}`;
  } else if (state) {
    return state;
  } else if (country) {
    return country;
  }
  return 'Unknown location';
}
