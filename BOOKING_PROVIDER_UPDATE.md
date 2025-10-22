# Booking Provider Update

## Overview

Added support for booking provider information to enable provider-specific booking flows in the frontend.

---

## Changes Made

### 1. Updated Data Types

**`lib/golfData.ts`**
- Added `provider` and `provider_id` to `GolfCourse` interface
- Updated `transformCourse()` to include these fields from database

```typescript
export interface GolfCourse {
  // ... existing fields
  website?: string;
  verified: boolean;
  // Booking provider info
  provider?: string | null;
  provider_id?: string | null;
  data?: any;
}
```

---

### 2. Created Booking Utilities

**`lib/bookingUtils.ts` ✨ NEW**

Provides helper functions for working with booking providers:

**Functions:**
- `generateBookingUrl()` - Generate provider-specific booking URLs
- `hasBookingProvider()` - Check if course has a booking provider
- `getProviderDisplayName()` - Get friendly provider name
- `supportsRealtimeAvailability()` - Check if provider has API support

**Supported Providers:**
- ✅ **TeeBox** - Placeholder for API integration
- ✅ **ForeTees** - Direct booking link
- ✅ **ChronoGolf** - Direct booking link
- ✅ **TeeSnap** - Direct booking link
- ✅ **Fallback** - Course website if no provider

---

### 3. Updated MCP Route

**`app/mcp/route.ts`**

**search_courses_by_area:**
- Now returns `website`, `provider`, `provider_id` in structured content

**book_tee_time:**
- Uses `generateBookingUrl()` to create provider-specific links
- Includes provider info in response
- Better response text with provider name

---

### 4. Updated Server Actions

**`app/actions/getCourses.ts`**
- Returns `website`, `provider`, `provider_id` for frontend use

---

## Usage in Frontend

### Course Data Structure

```typescript
interface Course {
  id: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  lon: number;
  lat: number;
  type: string;
  verified: boolean;
  website?: string | null;
  provider?: string | null;      // 'teefox', 'foretees', etc.
  provider_id?: string | null;   // Provider-specific course ID
}
```

### Rendering Logic

```typescript
import { generateBookingUrl, hasBookingProvider, getProviderDisplayName } from '@/lib/bookingUtils';

function CourseCard({ course }) {
  const hasProvider = hasBookingProvider(course.provider, course.provider_id);
  const providerName = getProviderDisplayName(course.provider);
  const bookingUrl = generateBookingUrl(
    course.provider,
    course.provider_id,
    course.website
  );

  return (
    <div>
      <h3>{course.name}</h3>
      
      {hasProvider ? (
        // Course has a booking provider
        <button onClick={() => handleProviderBooking(course)}>
          Book via {providerName}
        </button>
      ) : (
        // No provider, use website
        <a href={bookingUrl} target="_blank">
          Visit Website
        </a>
      )}
    </div>
  );
}
```

### Provider-Specific Logic

```typescript
function handleProviderBooking(course) {
  if (course.provider === 'teefox') {
    // TeeBox - fetch real-time tee times via API
    fetchTeeBoxAvailability(course.provider_id, selectedDate);
  } else {
    // Other providers - direct link
    window.open(generateBookingUrl(
      course.provider,
      course.provider_id,
      course.website,
      selectedDate,
      selectedTime,
      playerCount
    ), '_blank');
  }
}
```

---

## Provider Support

### TeeBox (teefox)
- **Status:** Ready for API integration
- **URL Format:** `https://www.teefox.com/book/{provider_id}?date=YYYY-MM-DD&time=HH:mm&players=N`
- **Real-time API:** ✅ Supported (to be implemented)
- **Next Step:** Implement TeeBox API integration

### ForeTees
- **Status:** ✅ Working
- **URL Format:** `https://foreupsoftware.com/index.php/booking/{provider_id}`
- **Real-time API:** ❌ Not available

### ChronoGolf
- **Status:** ✅ Working
- **URL Format:** `https://www.chronogolf.com/club/{provider_id}`
- **Real-time API:** ❌ Not available

### TeeSnap
- **Status:** ✅ Working
- **URL Format:** `https://www.teesnap.com/public/book/{provider_id}`
- **Real-time API:** ❌ Not available

### Website Fallback
- **Status:** ✅ Working
- **Used when:** No provider or unknown provider
- **URL:** Course website from database

---

## Example Responses

### Course with TeeBox Provider

```json
{
  "id": "torrey-pines-south",
  "name": "Torrey Pines Golf Course - South",
  "city": "La Jolla",
  "state": "CA",
  "provider": "teefox",
  "provider_id": "torrey-pines-south-123",
  "website": "https://www.sandiego.gov/golf/torreypines"
}
```

**Frontend can:**
- Detect `provider === 'teefox'`
- Call TeeBox API to get real-time tee times
- Show available times in UI
- Generate booking link with selected time

---

### Course with ForeTees Provider

```json
{
  "id": "pebble-beach",
  "name": "Pebble Beach Golf Links",
  "city": "Pebble Beach",
  "state": "CA",
  "provider": "foretees",
  "provider_id": "pebble-beach-456",
  "website": "https://www.pebblebeach.com"
}
```

**Frontend can:**
- Generate direct link: `https://foreupsoftware.com/index.php/booking/pebble-beach-456`
- Open in new tab

---

### Course with No Provider

```json
{
  "id": "augusta-national",
  "name": "Augusta National Golf Club",
  "city": "Augusta",
  "state": "GA",
  "provider": null,
  "provider_id": null,
  "website": "https://www.masters.com"
}
```

**Frontend can:**
- Detect no provider
- Show "Visit Website" button
- Link to course website

---

## Next Steps

### 1. Implement TeeBox API Integration

Create `lib/teefoxApi.ts`:

```typescript
export async function fetchTeeBoxAvailability(
  provider_id: string,
  date: string
) {
  // Call TeeBox API
  const response = await fetch(`/api/teefox/availability`, {
    method: 'POST',
    body: JSON.stringify({ provider_id, date })
  });
  
  return response.json();
}
```

### 2. Update Frontend UI

- Add provider-specific booking flows
- Show real-time availability for TeeBox courses
- Handle booking confirmation

### 3. Add Provider Icons

- TeeBox logo
- ForeTees logo
- ChronoGolf logo
- TeeSnap logo

---

## Testing

### Test Data

```typescript
// Test with TeeBox provider
const teefoxCourse = {
  provider: 'teefox',
  provider_id: 'test-123',
  website: 'https://example.com'
};

// Should return TeeBox URL
const url = generateBookingUrl(
  teefoxCourse.provider,
  teefoxCourse.provider_id,
  teefoxCourse.website,
  '2025-10-25',
  '09:00',
  4
);
// Expected: https://www.teefox.com/book/test-123?date=2025-10-25&time=09:00&players=4
```

### Test Cases

- [ ] Course with TeeBox provider
- [ ] Course with ForeTees provider
- [ ] Course with ChronoGolf provider
- [ ] Course with TeeSnap provider
- [ ] Course with no provider (website fallback)
- [ ] Course with unknown provider (website fallback)
- [ ] Course with no provider and no website (null)

---

## Summary

✅ **Data layer updated** - Provider info flows from DB to frontend  
✅ **Booking utilities created** - Helper functions for URL generation  
✅ **MCP tools updated** - Provider info in responses  
✅ **Server actions updated** - Provider info available to frontend  
🔜 **TeeBox API** - Ready for implementation  
🔜 **Frontend UI** - Ready for provider-specific flows  

The foundation is in place to implement provider-specific booking, starting with TeeBox API integration!
