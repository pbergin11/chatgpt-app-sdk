# Supabase Integration Guide

## Overview

Golf.ai now uses **real data from Supabase** instead of mock data. The system can handle complex queries like:

- "Show me golf courses in Alabama"
- "Which courses in Alabama have a driving range open tomorrow?"
- "Find public courses with spa facilities in California under $100"
- "Show me the longest courses in Arizona"

---

## Architecture

### Data Flow

```
User Query in ChatGPT
    ↓
MCP Tool (search_courses_by_area)
    ↓
lib/golfData.ts (Query Builder)
    ↓
Supabase PostgreSQL + PostGIS
    ↓
Transform & Return Results
    ↓
Golf Explorer Widget (Map + List)
```

### Key Files

1. **`lib/supabase.ts`** - Supabase client configuration
2. **`lib/golfData.ts`** - Database query layer (replaces mockGolfData.ts)
3. **`app/mcp/route.ts`** - MCP tools (updated to use real data)

---

## Setup Instructions

### 1. Environment Variables

Create or update `.env.local` with your Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Mapbox (existing)
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# Optional: Enable MCP logging
LOG_MCP=basic  # or 'full' or 'verbose'
```

### 2. Install Dependencies

```bash
npm install @supabase/supabase-js
# or
pnpm add @supabase/supabase-js
```

### 3. Database Schema

Your Supabase database should have the `golf_courses` table with the schema defined in `DATABASE_SCHEMA.md`.

Key columns:
- `id` - Course ID
- `course_name` - Course name
- `city`, `state`, `country` - Location
- `lat`, `lon` - GPS coordinates
- `amenities` - Array of amenity strings
- `data` - JSONB with full course details
- `provider`, `provider_id` - Booking system integration

---

## Query Capabilities

### Location-Based Searches

```typescript
// State-only (USA)
searchCoursesByArea(undefined, 'AL', undefined)
// Returns all courses in Alabama

// Country-only
searchCoursesByArea(undefined, undefined, 'Australia')
// Returns all courses in Australia

// City + State
searchCoursesByArea('Gadsden', 'AL', undefined)
// Returns courses in Gadsden, Alabama
```

### Amenity Filtering

The system checks the `amenities` array in the database:

```typescript
filters: {
  driving_range: true,  // Must have driving range
  spa: true,            // Must have spa
  lodging: true,        // Must have lodging
}
```

Common amenities in the database:
- `driving_range`
- `practice_putting_green`
- `club_house`
- `pro_shop`
- `power_carts`
- `rental_clubs`
- `coaching`
- `spa`
- `lodging`
- `locker_rooms`
- `beverage_cart`

### Range Hours Check

To answer "which courses have a range open tomorrow":

```typescript
// The checkRangeAvailability function queries the JSONB data field
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const isOpen = checkRangeAvailability(course, tomorrow);
```

This checks:
1. `course.data.golf.practice.range.available` - Is range available?
2. `course.data.golf.practice.range.hours[dayName]` - Hours for that day

Example data structure:
```json
{
  "golf": {
    "practice": {
      "range": {
        "available": true,
        "hours": {
          "mon": "07:00-19:00",
          "tue": "07:00-19:00",
          "wed": "07:00-19:00",
          "thu": "07:00-19:00",
          "fri": "07:00-19:00",
          "sat": "07:00-19:00",
          "sun": "07:00-19:00"
        }
      }
    }
  }
}
```

### Advanced Filters

```typescript
filters: {
  // Type
  type: 'public',
  types: ['public', 'resort'],
  
  // Price
  max_price: 100,
  min_price: 50,
  
  // Course attributes
  holes_in: [18],
  par_min: 70,
  par_max: 72,
  yardage_min: 6000,
  yardage_max: 7500,
  year_built_min: 2000,
  
  // Sorting
  sort_by: 'cheapest', // or 'longest', 'newest', 'highest_rated'
  
  // Text search
  search_text: 'championship',
  
  // Badges
  verified: true,
  best_in_state: true,
}
```

---

## Example Queries

### "Show me golf courses in Alabama"

```typescript
await searchCoursesByArea(undefined, 'AL', undefined);
```

Returns all courses where `state = 'AL'`.

### "Which courses in Alabama have a range open tomorrow?"

```typescript
const courses = await searchCoursesByArea(undefined, 'AL', undefined, 50, {
  has_range: true
});

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const coursesWithRangeOpen = courses.filter(course => 
  checkRangeAvailability(course, tomorrow)
);
```

### "Find public courses with spa in California under $100"

```typescript
await searchCoursesByArea(undefined, 'CA', undefined, 50, {
  type: 'public',
  spa: true,
  max_price: 100,
  sort_by: 'cheapest'
});
```

### "Show me the longest courses in Arizona"

```typescript
await searchCoursesByArea(undefined, 'AZ', undefined, 50, {
  sort_by: 'longest'
});
```

---

## Data Structure

### Course Object (Frontend)

```typescript
interface GolfCourse {
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
  data?: any; // Full JSONB data
}
```

### Supabase Row

```typescript
interface SupabaseCourse {
  id: string;
  course_name: string;
  city: string;
  state: string | null;
  country: string;
  lat: number;
  lon: number;
  amenities: string[] | null;
  data: any; // JSONB - contains all rich course details
  // ... many more fields
}
```

---

## Default Image

Since the database doesn't have course images yet, all courses use:

```typescript
const DEFAULT_COURSE_IMAGE = 'https://i.postimg.cc/9FLqXqYZ/golf-course-default.jpg';
```

You can update this in `lib/golfData.ts` or add image URLs to your database.

---

## Booking Integration

The system supports multiple booking providers:

```typescript
// Stored in database
{
  "provider": "teebox",
  "provider_id": "loc_ppQvtbdtwcQP"
}

// Generates booking link
https://www.teebox.com/book/loc_ppQvtbdtwcQP
```

Supported providers:
- **TeeBox** - `https://www.teebox.com/book/{provider_id}`
- **ForeTees** - `https://foreupsoftware.com/index.php/booking/{provider_id}`
- **ChronoGolf** - `https://www.chronogolf.com/club/{provider_id}`

---

## Performance Considerations

### Indexed Queries

The database has indexes on:
- `state` - Fast state-level searches
- `country` - Fast country-level searches
- `city` - Fast city searches
- `amenities` (GIN index) - Fast amenity filtering
- `type` - Fast type filtering

### Query Limits

All queries are limited to **100 results** to prevent overwhelming the UI and API.

### Caching

Consider adding Redis caching for frequently accessed queries:
- Popular cities (e.g., "courses in San Diego")
- State-level searches
- Top-rated courses

---

## Troubleshooting

### "Missing Supabase environment variables"

Make sure `.env.local` contains:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Restart your dev server after adding environment variables.

### "No courses found"

Check:
1. Database has data for that location
2. State codes are uppercase (e.g., 'AL' not 'al')
3. Filters aren't too restrictive

### "Amenity filter not working"

Verify the amenity name matches what's in the database:
- Database: `['driving_range', 'pro_shop']`
- Filter: `{ driving_range: true }` ✅
- Filter: `{ drivingRange: true }` ❌

---

## Next Steps

1. **Add real-time tee time availability** - Integrate with booking provider APIs
2. **Add course images** - Upload to Supabase Storage or CDN
3. **Add reviews/ratings** - Create separate `reviews` table
4. **Add caching** - Redis for popular queries
5. **Add analytics** - Track popular searches and courses

---

## Migration from Mock Data

The old `mockGolfData.ts` file is no longer used. All queries now go through:

1. `lib/golfData.ts` - Query builder
2. Supabase PostgreSQL - Database
3. Transform to frontend format

The MCP tools (`app/mcp/route.ts`) have been updated to use `await` for async database calls.
