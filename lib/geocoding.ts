/**
 * Geocoding utilities for Golf.ai
 * 
 * Handles converting location strings (city, state, country) into coordinates
 * for geospatial queries. Uses Mapbox Geocoding API.
 */

// Simple in-memory cache to avoid repeated API calls
const geocodeCache = new Map<string, { lat: number; lon: number } | null>();

export interface GeocodingResult {
  lat: number;
  lon: number;
  place_name: string;
}

/**
 * Geocode a location string to coordinates
 * Supports both USA (city, state) and international (city, country) formats
 */
export async function geocodeLocation(
  city?: string,
  state?: string,
  country?: string
): Promise<GeocodingResult | null> {
  // Build search query
  let searchQuery = '';
  
  if (city && state) {
    // USA format: "San Diego, CA"
    searchQuery = `${city}, ${state}, USA`;
  } else if (city && country) {
    // International format: "Sydney, Australia"
    searchQuery = `${city}, ${country}`;
  } else if (state) {
    // State only: "California, USA"
    searchQuery = `${state}, USA`;
  } else if (country) {
    // Country only: "Australia"
    searchQuery = country;
  } else {
    return null;
  }

  // Check cache first
  const cacheKey = searchQuery.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    const cached = geocodeCache.get(cacheKey);
    if (!cached) return null;
    return { ...cached, place_name: searchQuery };
  }

  // Use Mapbox Geocoding API if token is available
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  
  if (!mapboxToken) {
    console.warn('NEXT_PUBLIC_MAPBOX_TOKEN not set, skipping geocoding');
    geocodeCache.set(cacheKey, null);
    return null;
  }

  try {
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&limit=1`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Mapbox geocoding error:', response.status, response.statusText);
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      console.warn('No geocoding results for:', searchQuery);
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const feature = data.features[0];
    const [lon, lat] = feature.center;
    
    const result = {
      lat,
      lon,
      place_name: feature.place_name,
    };

    // Cache the result
    geocodeCache.set(cacheKey, { lat, lon });
    
    return result;
  } catch (error) {
    console.error('Geocoding error:', error);
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Get default radius based on location type
 * - City search: 25 miles
 * - State search: no radius (use state boundary)
 * - Country search: no radius (use country boundary)
 */
export function getDefaultRadius(city?: string, state?: string, country?: string): number | undefined {
  if (city) {
    return 25; // 25 mile radius for city searches
  }
  // For state/country searches, don't use radius - use exact match
  return undefined;
}
