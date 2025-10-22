/**
 * Booking Utilities
 * 
 * Helper functions for generating booking URLs based on provider type
 */

export type BookingProvider = 'teefox' | 'teebox' | 'foretees' | 'chronogolf' | 'teesnap' | null;

export interface BookingInfo {
  provider: BookingProvider;
  provider_id: string | null;
  website: string | null;
}

/**
 * Generate booking URL based on provider
 * 
 * @param provider - Booking provider name (teefox, teebox, foretees, etc.)
 * @param provider_id - Provider-specific course ID
 * @param website - Course website (fallback if no provider)
 * @param date - Optional date in YYYY-MM-DD format
 * @param time - Optional time in HH:mm format
 * @param players - Optional number of players
 * @returns Booking URL or null if no booking option available
 */
export function generateBookingUrl(
  provider: string | null,
  provider_id: string | null,
  website: string | null,
  date?: string,
  time?: string,
  players?: number
): string | null {
  // If we have a provider and provider_id, generate provider-specific URL
  if (provider && provider_id) {
    const providerLower = provider.toLowerCase();
    
    switch (providerLower) {
      case 'teefox':
        // TeeBox URL format (will implement API call separately)
        return buildTeeFoxUrl(provider_id, date, time, players);
      
      case 'teebox':
        return `https://www.teebox.com/book/${provider_id}`;
      
      case 'foretees':
        return `https://foreupsoftware.com/index.php/booking/${provider_id}`;
      
      case 'chronogolf':
        return `https://www.chronogolf.com/club/${provider_id}`;
      
      case 'teesnap':
        return `https://www.teesnap.com/public/book/${provider_id}`;
      
      default:
        // Unknown provider, fall back to website
        return website || null;
    }
  }
  
  // No provider, use website as fallback
  return website || null;
}

/**
 * Build TeeBox URL (placeholder for now, will implement API call)
 * 
 * For TeeBox, we'll need to make an API call to get available tee times
 * and then generate a booking URL. This is a placeholder that returns
 * a base URL for now.
 */
function buildTeeFoxUrl(
  provider_id: string,
  date?: string,
  time?: string,
  players?: number
): string {
  // Base URL - we'll enhance this with API data
  let url = `https://www.teefox.com/book/${provider_id}`;
  
  // Add query parameters if provided
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (time) params.append('time', time);
  if (players) params.append('players', players.toString());
  
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Check if a course has a booking provider
 */
export function hasBookingProvider(provider: string | null, provider_id: string | null): boolean {
  return !!(provider && provider_id);
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: string | null): string {
  if (!provider) return 'Website';
  
  const providerLower = provider.toLowerCase();
  
  switch (providerLower) {
    case 'teefox':
      return 'TeeBox';
    case 'teebox':
      return 'TeeBox';
    case 'foretees':
      return 'ForeTees';
    case 'chronogolf':
      return 'ChronoGolf';
    case 'teesnap':
      return 'TeeSnap';
    default:
      return provider;
  }
}

/**
 * Check if provider supports real-time tee time availability
 */
export function supportsRealtimeAvailability(provider: string | null): boolean {
  if (!provider) return false;
  
  const providerLower = provider.toLowerCase();
  
  // Only TeeBox supports real-time API for now
  return providerLower === 'teefox' || providerLower === 'teebox';
}
