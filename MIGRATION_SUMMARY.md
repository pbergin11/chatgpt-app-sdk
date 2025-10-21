# Migration Summary: Mock Data → Supabase

## What Changed

Golf.ai has been migrated from mock data to **real Supabase database queries**. The system now queries your PostgreSQL database with all golf courses worldwide.

---

## Files Created

### 1. `lib/supabase.ts`
- Supabase client configuration
- Type definitions for database schema
- Uses service role key for server-side queries

### 2. `lib/golfData.ts`
- **Replaces** `app/mcp/mockGolfData.ts`
- Database query layer with filtering, sorting, and search
- Transforms Supabase data to frontend format
- Handles complex queries like "courses with range open tomorrow"

### 3. `SUPABASE_INTEGRATION.md`
- Complete integration guide
- Query examples and capabilities
- Troubleshooting tips

### 4. `env.example`
- Template for environment variables
- Copy to `.env.local` and fill in your credentials

---

## Files Modified

### `app/mcp/route.ts`
**Changes:**
- Import from `@/lib/golfData` instead of `./mockGolfData`
- Added `await` to all database calls (now async)
- Updated course detail extraction to use JSONB `data` field
- Added booking provider link generation (TeeBox, ForeTees, ChronoGolf)
- Removed mock availability data (will be added with real-time API integration)

**Before:**
```typescript
import { searchCoursesByArea } from "./mockGolfData";
const courses = searchCoursesByArea(city, state, country);
```

**After:**
```typescript
import { searchCoursesByArea } from "@/lib/golfData";
const courses = await searchCoursesByArea(city, state, country, radius, filters);
```

---

## Data Structure

### Your Supabase Data (Example)
```json
{
  "id": "f035214eb9014d8d968084343300fce3",
  "course_name": "Twin Bridges Golf Club",
  "city": "Gadsden",
  "state": "AL",
  "country": "USA",
  "lat": 34.00824,
  "lon": -85.94424,
  "amenities": ["driving_range", "pro_shop", "power_carts"],
  "walk_rate_min": "35.00",
  "walk_rate_max": "45.00",
  "data": {
    "golf": {
      "practice": {
        "range": {
          "available": true,
          "hours": {
            "mon": "07:00-19:00",
            "tue": "07:00-19:00",
            ...
          }
        }
      },
      "courses": [{
        "architecture": {
          "original_architects": ["Gene Bates"]
        },
        "year_opened": 2002,
        "local_rules": "..."
      }]
    }
  }
}
```

### Transformed for Frontend
```typescript
{
  id: "f035214eb9014d8d968084343300fce3",
  name: "Twin Bridges Golf Club",
  city: "Gadsden",
  state: "AL",
  country: "USA",
  lon: -85.94424,
  lat: 34.00824,
  holes: 18,
  par: 72,
  yardage: 6734,
  average_price: 40,  // Calculated from walk_rate_min/max
  amenities: ["driving_range", "pro_shop", "power_carts"],
  image_url: "https://i.postimg.cc/9FLqXqYZ/golf-course-default.jpg",
  verified: true,
  data: { ... } // Full JSONB data available for details
}
```

---

## Query Capabilities

### ✅ Now Supported

1. **Location Searches**
   - State-only: "courses in Alabama"
   - Country-only: "courses in Australia"
   - City + State: "courses in Gadsden, AL"

2. **Amenity Filtering**
   - "courses with driving range"
   - "courses with spa and lodging"
   - "public courses with pro shop"

3. **Price Filtering**
   - "courses under $100"
   - "courses between $50 and $150"

4. **Course Attributes**
   - "18-hole courses only"
   - "courses over 7000 yards"
   - "courses built after 2000"

5. **Sorting**
   - Cheapest to most expensive
   - Longest to shortest
   - Newest to oldest
   - Highest rated

6. **Complex Queries**
   - "Which courses in Alabama have a range open tomorrow?"
   - Uses `checkRangeAvailability()` to query JSONB hours data

### ⏳ Coming Soon

1. **Real-time tee time availability**
   - Requires booking provider API integration
   - Currently shows estimated pricing only

2. **Course images**
   - All courses use default image for now
   - Add to Supabase Storage or CDN

3. **User reviews/ratings**
   - Currently uses default 4.5 stars for verified courses

---

## Setup Steps

### 1. Install Dependencies
```bash
pnpm add @supabase/supabase-js
```

### 2. Configure Environment
Copy `env.example` to `.env.local`:
```bash
cp env.example .env.local
```

Fill in your Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

### 3. Restart Dev Server
```bash
pnpm dev
```

---

## Testing

### Test Queries in ChatGPT

1. **"Show me golf courses in Alabama"**
   - Should return all AL courses from database

2. **"Find public courses with driving range in Alabama under $50"**
   - Tests type, amenity, and price filtering

3. **"Which courses in Alabama have a range open tomorrow?"**
   - Tests JSONB hours query

4. **"Show me details for Twin Bridges Golf Club"**
   - Tests course detail view with full data

### Test Locally

Visit `http://localhost:3000` - you'll see the UI shell (no data without ChatGPT context).

---

## Performance Notes

- **Query limit**: 100 courses per search (prevents UI overload)
- **Indexes**: Database has indexes on state, city, country, amenities
- **Caching**: Consider adding Redis for popular queries
- **Images**: Default image used (no DB storage yet)

---

## Breaking Changes

### Removed
- `app/mcp/mockGolfData.ts` - No longer used
- Mock availability data - Will be replaced with real-time API

### Changed
- All MCP tool handlers are now `async`
- Course data structure slightly different (uses JSONB `data` field)
- Booking links now generated from `provider` + `provider_id`

---

## Next Steps

1. ✅ **Database integration** - Complete
2. ✅ **Query layer** - Complete
3. ✅ **MCP tools updated** - Complete
4. ⏳ **Add real-time tee times** - Requires booking API integration
5. ⏳ **Add course images** - Upload to Supabase Storage
6. ⏳ **Add reviews** - Create reviews table
7. ⏳ **Add caching** - Redis for performance
8. ⏳ **Deploy to Vercel** - Test in production

---

## Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` exists and has correct values
- Restart dev server after adding env vars

### "No courses found"
- Verify database has data for that location
- Check state codes are uppercase ('AL' not 'al')
- Check filters aren't too restrictive

### "TypeScript errors"
- Run `pnpm build` to check for errors
- All type definitions are in `lib/supabase.ts` and `lib/golfData.ts`

---

## Support

See `SUPABASE_INTEGRATION.md` for detailed documentation on:
- Query capabilities
- Data structures
- Advanced filtering
- Booking integration
- Performance optimization
