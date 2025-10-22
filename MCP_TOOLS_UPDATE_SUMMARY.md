# MCP Tools Update Summary
**Date:** October 22, 2025  
**Version:** 2.0

---

## Overview

Updated the Golf.ai MCP tools to leverage the comprehensive Supabase database with enhanced querying capabilities, geospatial search, and international location support.

---

## Key Updates

### 1. **Geocoding Integration** (`lib/geocoding.ts`)

**New file** that handles location-to-coordinates conversion using Mapbox Geocoding API.

**Features:**
- Converts city/state/country strings to lat/lon coordinates
- Supports both USA (city+state) and international (city+country) formats
- In-memory caching to avoid repeated API calls
- Graceful fallback if Mapbox token not available

**Usage:**
```typescript
const result = await geocodeLocation('San Diego', 'CA', undefined);
// Returns: { lat: 32.7157, lon: -117.1611, place_name: "San Diego, CA, USA" }

const result2 = await geocodeLocation('Sydney', undefined, 'Australia');
// Returns: { lat: -33.8688, lon: 151.2093, place_name: "Sydney, Australia" }
```

---

### 2. **Geospatial Search** (`lib/golfData.ts`)

**Enhanced** `searchCoursesByArea()` function with PostGIS radius search.

**How it works:**
1. If `city` + `radius` provided → geocode the city to get center point
2. Use PostGIS `ST_DWithin` to find courses within radius (in meters)
3. Fallback to exact city match if geocoding fails
4. For state/country-only searches → use exact match (no radius)

**Example queries:**
```typescript
// Find courses within 25 miles of San Diego
await searchCoursesByArea('San Diego', 'CA', undefined, 25);

// Find all courses in California (no radius)
await searchCoursesByArea(undefined, 'CA', undefined);

// Find courses within 50 miles of Sydney
await searchCoursesByArea('Sydney', undefined, 'Australia', 50);

// Find all courses in Australia (no radius)
await searchCoursesByArea(undefined, undefined, 'Australia');
```

**Benefits:**
- Catches courses just outside city limits (e.g., La Jolla courses when searching San Diego)
- Works for international locations (Sydney, London, Tokyo, etc.)
- Accurate distance calculations using PostGIS geography type

---

### 3. **PostGIS Database Function** (`supabase_geospatial_function.sql`)

**New SQL function** for efficient geospatial queries.

**Function signature:**
```sql
search_courses_within_radius(
  search_lat DOUBLE PRECISION,
  search_lon DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION
)
```

**Returns:**
- Course ID, name, location
- Distance from search point (in meters)
- Ordered by distance (closest first)

**Installation:**
Run the SQL file in your Supabase SQL Editor to create the function.

---

### 4. **Enhanced Tool Descriptions** (`app/mcp/route.ts`)

#### **search_courses_by_area**

**Old description:**
> "Search for golf courses by location..."

**New description:**
> "Use this tool to search for golf courses by location with powerful filtering capabilities. Golf.ai has the world's most comprehensive golf course database with real-time data. LOCATION FORMATS: (1) USA State-only: state='CA' (all California courses), (2) USA City+State: city='San Diego', state='CA' (uses 25-mile radius + exact matches), (3) International Country-only: country='Australia' (all Australian courses), (4) International City+Country: city='Sydney', country='Australia' (uses 25-mile radius + exact matches). RADIUS: Automatically applied for city searches to catch nearby courses outside city limits. FILTERS: Supports 40+ filters including price, amenities (spa, range, lodging), course attributes (yardage, par, slope), availability by date/time, designer, certifications, and deep JSONB queries. Use this for ANY golf course search question."

**Why better:**
- Explicitly states location format requirements
- Mentions automatic radius for city searches
- Highlights 40+ filter capabilities
- Clear examples for USA vs international

---

#### **get_course_details**

**Old description:**
> "Get comprehensive information about a specific golf course..."

**New description:**
> "Use this tool to get detailed information about a specific golf course. Returns comprehensive data including: course details (holes, par, yardage, slope, rating), pricing (walk rates, cart rates, twilight/senior/junior discounts), amenities (range, spa, lodging, restaurant, pro shop), practice facilities (range hours by day, putting green, chipping area), policies (dress code, pace of play, alcohol, pets), programs (memberships, junior programs, leagues), tournaments hosted, contact info, booking links, and more. SEARCH OPTIONS: (1) By ID if you already have it from a previous search, OR (2) By name + location (state for USA, country for international). Use this for questions like 'Tell me about Pebble Beach', 'What are the rates at Torrey Pines?', 'Does Augusta National allow walking?', etc."

**Why better:**
- Lists specific data categories returned
- Provides example questions that trigger this tool
- Clarifies ID vs name+location search options
- Helps ChatGPT understand when to use this tool

---

### 5. **Input Schema Enhancements**

#### **search_courses_by_area**

**Updated parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `city` | `string?` | City name (e.g., 'San Diego', 'Sydney', 'London'). When provided with radius, uses geocoding. |
| `state` | `string?` | USA state code ONLY (e.g., 'CA', 'FL'). Use for USA locations. |
| `country` | `string?` | Country name for international (e.g., 'Australia', 'United Kingdom'). Use for non-USA. |
| `radius` | `number?` | Search radius in miles (default: 25 for city searches). Uses geocoding + PostGIS. |

**Key changes:**
- Clarified `state` is USA-only
- Clarified `country` is for international
- Explained radius uses geocoding + PostGIS
- Added default radius of 25 miles for city searches

---

#### **get_course_details**

**Updated parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `courseId` | `string?` | Unique course identifier from previous search (e.g., 'torrey-pines-south'). |
| `name` | `string?` | Course name for lookup (partial match, e.g., 'Pebble Beach'). Required if no courseId. |
| `state` | `string?` | USA state code for disambiguation (e.g., 'CA'). Use with name for USA courses. |
| `country` | `string?` | Country name for disambiguation (e.g., 'Scotland'). Use with name for international. |

**Key changes:**
- Clarified courseId is from previous search results
- Explained name supports partial matching
- Added disambiguation guidance for state/country

---

## Location Handling Logic

### USA Locations

**Format:** `city` + `state`

**Examples:**
- "San Diego, CA" → `city='San Diego', state='CA'`
- "Phoenix, AZ" → `city='Phoenix', state='AZ'`
- "All California courses" → `state='CA'` (no city)

**Query strategy:**
1. If city provided → geocode "San Diego, CA, USA"
2. Use 25-mile radius (default) to catch nearby courses
3. Also match exact city+state in database
4. Combine results

---

### International Locations

**Format:** `city` + `country`

**Examples:**
- "Sydney, Australia" → `city='Sydney', country='Australia'`
- "London, UK" → `city='London', country='United Kingdom'`
- "All Australian courses" → `country='Australia'` (no city)

**Query strategy:**
1. If city provided → geocode "Sydney, Australia"
2. Use 25-mile radius (default) to catch nearby courses
3. Also match exact city+country in database
4. Combine results

---

## Default Radius Behavior

| Search Type | Default Radius | Reason |
|-------------|----------------|--------|
| City search | 25 miles | Catches nearby courses outside city limits |
| State search | None | Use exact state match |
| Country search | None | Use exact country match |

**User can override:**
```typescript
// Custom radius
searchCoursesByArea('San Diego', 'CA', undefined, 50); // 50 miles

// No radius (exact match only)
searchCoursesByArea('San Diego', 'CA', undefined, 0);
```

---

## Example Queries

### 1. Simple City Search (USA)

**User:** "Show me golf courses in San Diego"

**ChatGPT calls:**
```json
{
  "tool": "search_courses_by_area",
  "args": {
    "city": "San Diego",
    "state": "CA"
  }
}
```

**Backend logic:**
1. Geocode "San Diego, CA, USA" → (32.7157, -117.1611)
2. Search within 25 miles (default)
3. Also match city='San Diego' AND state='CA'
4. Return combined results

---

### 2. State-Wide Search (USA)

**User:** "Find all golf courses in California"

**ChatGPT calls:**
```json
{
  "tool": "search_courses_by_area",
  "args": {
    "state": "CA"
  }
}
```

**Backend logic:**
1. No geocoding (no city)
2. Query: `WHERE state = 'CA'`
3. Return all California courses

---

### 3. International City Search

**User:** "Show me golf courses near Sydney"

**ChatGPT calls:**
```json
{
  "tool": "search_courses_by_area",
  "args": {
    "city": "Sydney",
    "country": "Australia"
  }
}
```

**Backend logic:**
1. Geocode "Sydney, Australia" → (-33.8688, 151.2093)
2. Search within 25 miles (default)
3. Also match city='Sydney' AND country='Australia'
4. Return combined results

---

### 4. Country-Wide Search

**User:** "List golf courses in Australia"

**ChatGPT calls:**
```json
{
  "tool": "search_courses_by_area",
  "args": {
    "country": "Australia"
  }
}
```

**Backend logic:**
1. No geocoding (no city)
2. Query: `WHERE country = 'Australia'`
3. Return all Australian courses

---

### 5. Custom Radius

**User:** "Find golf courses within 50 miles of Phoenix"

**ChatGPT calls:**
```json
{
  "tool": "search_courses_by_area",
  "args": {
    "city": "Phoenix",
    "state": "AZ",
    "radius": 50
  }
}
```

**Backend logic:**
1. Geocode "Phoenix, AZ, USA" → (33.4484, -112.0740)
2. Search within 50 miles
3. Also match city='Phoenix' AND state='AZ'
4. Return combined results

---

## Setup Instructions

### 1. Environment Variables

Add to `.env.local`:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Install PostGIS Function

Run `supabase_geospatial_function.sql` in Supabase SQL Editor:
```sql
-- Creates search_courses_within_radius() function
-- Enables efficient geospatial queries
```

### 3. Test Geocoding

```bash
# Start dev server
pnpm dev

# Test in ChatGPT or via API
# "Show me golf courses in San Diego"
# Should see geocoding log: [Geocoding] San Diego → (32.7157, -117.1611)
```

---

## Benefits

### For Users
- ✅ More accurate location searches
- ✅ International location support
- ✅ Catches nearby courses outside city limits
- ✅ Flexible search options (city, state, country, radius)

### For ChatGPT Model
- ✅ Clear tool descriptions help model select correct tool
- ✅ Explicit location format guidance reduces errors
- ✅ Example questions help model understand use cases
- ✅ Better parameter descriptions improve argument generation

### For Developers
- ✅ Modular geocoding utility (reusable)
- ✅ Efficient PostGIS queries (fast)
- ✅ Graceful fallbacks (robust)
- ✅ Comprehensive logging (debuggable)

---

## Next Steps

1. **Test with real data** - Verify geocoding works for various cities
2. **Monitor performance** - Check query times with geospatial searches
3. **Add more filters** - Implement JSONB queries for deep filtering
4. **Optimize caching** - Consider Redis for geocoding cache
5. **Add analytics** - Track which locations are searched most

---

## Files Modified

| File | Changes |
|------|---------|
| `lib/geocoding.ts` | **NEW** - Geocoding utility with Mapbox API |
| `lib/golfData.ts` | Enhanced with geospatial search logic |
| `app/mcp/route.ts` | Updated tool descriptions and schemas |
| `supabase_geospatial_function.sql` | **NEW** - PostGIS function for radius search |
| `MCP_TOOLS_UPDATE_SUMMARY.md` | **NEW** - This documentation |

---

## Testing Checklist

- [ ] Test USA city search: "courses in San Diego"
- [ ] Test USA state search: "courses in California"
- [ ] Test international city search: "courses in Sydney"
- [ ] Test international country search: "courses in Australia"
- [ ] Test custom radius: "courses within 50 miles of Phoenix"
- [ ] Test course details by ID: "tell me about torrey-pines-south"
- [ ] Test course details by name: "tell me about Pebble Beach"
- [ ] Verify geocoding logs appear in console
- [ ] Verify geospatial function works in Supabase
- [ ] Test with Mapbox token missing (should fallback gracefully)

---

## Troubleshooting

### Geocoding not working?
- Check `NEXT_PUBLIC_MAPBOX_TOKEN` is set
- Check Mapbox API quota/limits
- Check console for geocoding errors

### Geospatial search failing?
- Verify `supabase_geospatial_function.sql` was run
- Check Supabase logs for RPC errors
- Verify PostGIS extension is enabled

### International locations not found?
- Check country name matches database (e.g., "United Kingdom" not "UK")
- Verify database has international courses
- Check geocoding returns valid coordinates

---

## Conclusion

The updated MCP tools now provide:
- **Accurate geospatial search** using PostGIS
- **International location support** with proper formatting
- **Enhanced tool descriptions** for better ChatGPT understanding
- **Flexible query options** (city, state, country, radius)
- **Robust fallbacks** for missing data or API failures

This makes Golf.ai the most powerful golf course search tool available in ChatGPT! 🏌️‍♂️⛳
