# TeeBox Filters & Date Navigation Update

## Overview

Added interactive filter controls and date navigation to the tee times display, allowing users to customize their search parameters in real-time.

---

## Features Added

✅ **Date Navigation** - Left/right arrows to change dates  
✅ **Players Filter** - Dropdown to select 1-4 players  
✅ **Holes Filter** - Dropdown to select 9 or 18 holes  
✅ **Price Display** - Shows dynamic price range from results  
✅ **Real-time Updates** - Filters trigger immediate API refetch  

---

## UI Components

### Date Navigation Bar
```
← | Wed, Oct 22 | →
```
- **Left arrow:** Previous day
- **Center:** Current selected date
- **Right arrow:** Next day
- Clicking arrows refetches tee times for new date

### Filter Controls

**Players Dropdown:**
- Icon: 👥 (people icon)
- Options: 1, 2, 3, 4 players
- Default: 4 players
- Background: Cream color (`var(--color-bg-cream)`)

**Holes Dropdown:**
- Icon: ⛳ (flag icon)
- Options: 9, 18 holes
- Default: 18 holes
- Background: Cream color

**Price Display:**
- Icon: 💵 (dollar icon)
- Shows: `$27 - $67 per player`
- Dynamically calculated from results
- Read-only (informational)

---

## API Integration

### Updated Parameters

**Backend (`app/api/teefox/route.ts`):**
```typescript
GET /api/teefox?location_id=xxx&date=2025-10-22&patrons=[4]&holes=[18]
```

**Hook (`app/hooks/use-tee-times.ts`):**
```typescript
fetchTeeTimes(locationId, date, {
  patrons: 4,
  holes: 18
})
```

### TeeBox API Format

**Patrons:** `"[1,2,3,4]"` (JSON array as string)  
**Holes:** `"[9,18]"` (JSON array as string)  

---

## User Flow

1. **User clicks course card** → Card expands
2. **Tee times load** with default filters (4 players, 18 holes)
3. **User changes filter:**
   - Selects "2 players" from dropdown
   - API refetches: `/api/teefox?...&patrons=[2]`
   - Tee times update instantly
4. **User navigates dates:**
   - Clicks right arrow
   - Date changes to tomorrow
   - API refetches with new date
   - Tee times update

---

## State Management

### Filter State
```typescript
const [teeTimeFilters, setTeeTimeFilters] = useState({
  patrons: 4,
  holes: 18,
  minPrice: 0,
  maxPrice: 200,
});
```

### Filter Updates Trigger Refetch
```typescript
onChange={(e) => {
  const newPatrons = parseInt(e.target.value);
  setTeeTimeFilters(prev => ({ ...prev, patrons: newPatrons }));
  fetchTeeTimes(provider_id, date, {
    patrons: newPatrons,
    holes: teeTimeFilters.holes,
  });
}}
```

---

## Design Specifications

### Filter Bar Layout
```
[Date Navigation]
← | Wed, Oct 22 | →

[Filter Controls]
👥 4 players | ⛳ 18 holes | 💵 $27 - $67 per player
```

### Styling

**Date Navigation:**
- Arrows: 16px, gray color
- Date text: 12px, medium weight, black
- Hover: Light gray background
- Spacing: Justified between

**Filter Dropdowns:**
- Background: `var(--color-bg-cream)`
- Text: 12px, medium weight
- Padding: 4px 8px
- Border radius: 6px
- Icon size: 14px
- No visible dropdown arrow (native select)

**Price Display:**
- Same styling as dropdowns
- Read-only (no interaction)
- Gray text for icon, black for price

---

## Code Changes

### Files Modified

1. **`app/api/teefox/route.ts`**
   - Added `patrons` and `holes` query parameters
   - Build URL with optional filters

2. **`app/hooks/use-tee-times.ts`**
   - Updated `fetchTeeTimes()` signature to accept options
   - Format patrons/holes as JSON arrays

3. **`app/golf/page.tsx`**
   - Added `teeTimeFilters` state
   - Created date navigation UI
   - Created filter dropdowns UI
   - Refetch on filter change
   - Refetch on date change

---

## Example API Calls

### Default (4 players, 18 holes)
```
GET /api/teefox?location_id=loc_6uLeL1PJwIP2&date=2025-10-22&patrons=[4]&holes=[18]
```

### 2 players, 9 holes
```
GET /api/teefox?location_id=loc_6uLeL1PJwIP2&date=2025-10-22&patrons=[2]&holes=[9]
```

### Date navigation (next day)
```
GET /api/teefox?location_id=loc_6uLeL1PJwIP2&date=2025-10-23&patrons=[4]&holes=[18]
```

---

## Future Enhancements

### Price Range Filter (Not Yet Implemented)
The TeeBox API doesn't support price filtering directly, so we would need to:
1. Fetch all tee times
2. Filter client-side by price range
3. Display filtered results

**Implementation:**
```typescript
const filteredTeeTimes = teeTimesData.teetimes.filter(t => {
  const price = t.pricePerPatron / 100;
  return price >= minPrice && price <= maxPrice;
});
```

### Additional Filters (Future)
- **Time of day:** Morning, afternoon, twilight
- **Fast teesheets only:** `fastTeesheetsOnly=true`
- **Slow teesheets only:** `slowTeesheetsOnly=true`
- **Search radius:** For location-based searches

---

## Testing Checklist

- [x] Players dropdown changes tee times
- [x] Holes dropdown changes tee times
- [x] Left arrow navigates to previous day
- [x] Right arrow navigates to next day
- [x] Price range updates based on results
- [x] Filters persist when changing dates
- [x] Loading state shows during refetch
- [x] Error handling for failed refetch
- [ ] Test with 9-hole courses
- [ ] Test with 1-2 player availability
- [ ] Test date boundaries (past dates)

---

## Summary

✅ **Interactive filters** for players and holes  
✅ **Date navigation** with left/right arrows  
✅ **Real-time updates** on filter changes  
✅ **Clean UI** matching design specifications  
✅ **Proper API integration** with TeeBox format  

Users can now customize their tee time search without leaving the card! 🎯⛳
