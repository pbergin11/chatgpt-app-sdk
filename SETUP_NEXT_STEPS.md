# Setup & Next Steps

## ✅ What's Been Done

All code updates are complete! The following files have been created/modified:

### New Files Created
- ✅ `lib/geocoding.ts` - Geocoding utility
- ✅ `supabase_geospatial_function.sql` - PostGIS function
- ✅ `MCP_TOOLS_UPDATE_SUMMARY.md` - Detailed documentation
- ✅ `TOOL_USAGE_GUIDE.md` - Quick reference
- ✅ `IMPLEMENTATION_SUMMARY.md` - High-level summary
- ✅ `CHANGELOG.md` - Version history
- ✅ `SETUP_NEXT_STEPS.md` - This file

### Files Modified
- ✅ `lib/golfData.ts` - Added geospatial search
- ✅ `app/mcp/route.ts` - Enhanced tool descriptions

---

## 🚀 Immediate Setup Steps

### Step 1: Add Mapbox Token

1. Get a Mapbox token from https://account.mapbox.com/access-tokens/
2. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJ5b3VyLXRva2VuIn0...
   ```

**Note:** The app will work without this, but geocoding will be disabled (falls back to exact city match).

---

### Step 2: Install PostGIS Function

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase_geospatial_function.sql`
3. Paste and run the SQL
4. Verify function created:
   ```sql
   SELECT * FROM search_courses_within_radius(32.7157, -117.1611, 40233.6);
   ```

**Expected:** Returns courses within 25 miles of San Diego

---

### Step 3: Test Locally

```bash
# Start dev server
pnpm dev

# Open http://localhost:3000
```

**Test in ChatGPT (if connected):**
- "Show me golf courses in San Diego"
- "Find courses in Sydney, Australia"
- "List all California courses"

**Check console for logs:**
```
[Geocoding] San Diego → (32.7157, -117.1611)
🔍 search_courses_by_area called
  Input: { city: 'San Diego', state: 'CA', radius: undefined, filters: {} }
  ✅ Returning 15 courses in San Diego, CA (234.56ms)
```

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] USA city search: "courses in San Diego"
- [ ] USA state search: "courses in California"
- [ ] International city: "courses in Sydney"
- [ ] International country: "courses in Australia"

### Geospatial Search
- [ ] Geocoding logs appear in console
- [ ] Courses found within radius
- [ ] Fallback works if geocoding fails

### Course Details
- [ ] By ID: "tell me about torrey-pines-south"
- [ ] By name: "tell me about Pebble Beach"
- [ ] International: "tell me about St Andrews"

### Filters
- [ ] Price: "public courses under $100 in San Diego"
- [ ] Amenities: "courses with spa and lodging in California"
- [ ] Attributes: "18-hole courses over 7000 yards in Arizona"

### Error Handling
- [ ] No location: Should return error message
- [ ] State AND country: Should return error message
- [ ] Course not found: Should return error message
- [ ] Mapbox token missing: Should fallback gracefully

---

## 📊 Monitoring

### Check Logs

**Local Development:**
```bash
# Terminal where pnpm dev is running
[Geocoding] San Diego → (32.7157, -117.1611)
[MCP] 🔍 search_courses_by_area called
[MCP]   Input: { city: 'San Diego', state: 'CA' }
[MCP]   ✅ Returning 15 courses in San Diego, CA (234ms)
```

**Vercel Production:**
- Go to Vercel Dashboard → Your Project → Logs
- Filter by "Runtime Logs"
- Look for `[Geocoding]` and `[MCP]` prefixes

### Mapbox API Usage

Check usage at: https://account.mapbox.com/

**Free tier:** 100,000 requests/month  
**Expected usage:** ~1,000-5,000/month (with caching)

---

## 🔧 Configuration Options

### Geocoding Cache

Currently uses in-memory cache (resets on server restart).

**For production, consider Redis:**
```typescript
// lib/geocoding.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// Check Redis cache before Mapbox API
const cached = await redis.get(`geocode:${cacheKey}`);
if (cached) return JSON.parse(cached);

// After geocoding, cache for 30 days
await redis.setex(`geocode:${cacheKey}`, 30 * 24 * 60 * 60, JSON.stringify(result));
```

### Default Radius

Currently: 25 miles for city searches

**To change:**
```typescript
// app/mcp/route.ts (line 300)
const effectiveRadius = city && radius === undefined ? 50 : radius; // Change 25 to 50
```

### Logging Level

Set in `.env.local`:
```bash
LOG_MCP=none     # No logs
LOG_MCP=basic    # Tool calls and results
LOG_MCP=full     # Include request/response data
LOG_MCP=verbose  # Everything
```

---

## 🐛 Troubleshooting

### Geocoding not working?

**Check:**
1. `NEXT_PUBLIC_MAPBOX_TOKEN` is set in `.env.local`
2. Token is valid (test at https://account.mapbox.com/)
3. Token has geocoding scope enabled
4. Check console for geocoding errors

**Fallback:** App will use exact city match if geocoding fails

---

### Geospatial search failing?

**Check:**
1. `supabase_geospatial_function.sql` was run
2. Function exists in Supabase (SQL Editor → Functions)
3. PostGIS extension is enabled
4. Check Supabase logs for RPC errors

**Fallback:** App will use exact city match if RPC fails

---

### No courses found?

**Check:**
1. Database has courses in that location
2. Location spelling matches database (e.g., "United Kingdom" not "UK")
3. Check console logs for query details
4. Try broader search (state/country instead of city)

---

### International locations not working?

**Check:**
1. Using `country` parameter (not `state`)
2. Country name matches database exactly
3. Geocoding returns valid coordinates
4. Database has courses in that country

**Example:**
```json
// ✅ Correct
{ "city": "Sydney", "country": "Australia" }

// ❌ Wrong
{ "city": "Sydney", "state": "NSW" }
```

---

## 📚 Documentation

### For Developers
- `MCP_TOOLS_UPDATE_SUMMARY.md` - Comprehensive technical details
- `IMPLEMENTATION_SUMMARY.md` - High-level overview
- `CHANGELOG.md` - Version history

### For Users
- `TOOL_USAGE_GUIDE.md` - Quick reference for tool usage
- `2025-10-22-DATA_SCHEMA.md` - Database schema and query capabilities

### For Reference
- `APPS_SDK_MASTER_REFERENCE.md` - OpenAI Apps SDK documentation
- `README.md` - Project overview
- `SUPABASE_INTEGRATION.md` - Database integration guide

---

## 🎯 Success Criteria

You'll know it's working when:

✅ Geocoding logs appear in console  
✅ City searches return courses within radius  
✅ International searches work (Sydney, London, etc.)  
✅ State/country searches return all courses in that area  
✅ Course details load correctly  
✅ Filters work as expected  
✅ No errors in console  

---

## 🚀 Deployment

### Vercel

1. Push changes to GitHub
2. Vercel will auto-deploy
3. Add environment variables in Vercel Dashboard:
   - `NEXT_PUBLIC_MAPBOX_TOKEN`
   - `NEXT_PUBLIC_SUPABASE_URL` (already set)
   - `SUPABASE_SERVICE_ROLE_KEY` (already set)

### Supabase

1. Run `supabase_geospatial_function.sql` in production Supabase
2. Verify function works in production

---

## 📞 Support

If you encounter issues:

1. Check console logs for errors
2. Review troubleshooting section above
3. Check Supabase logs for database errors
4. Verify environment variables are set
5. Test with simpler queries first

---

## 🎉 You're Ready!

The implementation is complete. Just follow the setup steps above and you'll have:

🗺️ Geospatial search with PostGIS  
🌍 International location support  
📝 Enhanced tool descriptions  
🎯 Flexible query options  
🛡️ Robust error handling  

**Next:** Set up Mapbox token, install PostGIS function, and test! 🚀
