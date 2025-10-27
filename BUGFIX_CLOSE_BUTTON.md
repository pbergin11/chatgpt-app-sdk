# Bug Fix: Close Button Overlapping Content

## Issue
The down arrow close button on expanded cards was overlapping with course names and other content, making it hard to read the text underneath.

## Root Cause
The close button had multiple issues:
1. **Low z-index** (`z-10`) - not high enough to ensure it stays above all content
2. **Semi-transparent background** (`bg-white/90`) - allowed text to show through
3. **No shadow** - didn't visually separate from content behind it
4. **Layout conflict** - "No Tee Times" badge was in the same row, competing for space in the top-right corner

## Solution
Updated the close button styling and layout:
1. **Higher z-index**: `zIndex: 50` (inline style) - ensures it's always on top
2. **Solid background**: `bg-white` instead of `bg-white/90` - prevents text bleed-through
3. **Shadow**: `shadow-md hover:shadow-lg` - creates visual separation
4. **Layout restructure**: Moved "No Tee Times" badge to its own row below the course name
5. **Reserved space**: Added `pr-7` padding to content area to prevent text from reaching close button

## Code Changes

### File 1: `app/golf/components/cards/ExpandedCardInline.tsx`

**Change 1: Container padding (line 85)**
```tsx
// Before
<div className="flex-1 flex flex-col min-w-0 justify-center">

// After
<div className="flex-1 flex flex-col min-w-0 justify-center pr-7">
```

**Change 2: Close button styling (lines 87-99)**
```tsx
// Before
<button
  className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1 hover:bg-white transition-all group z-10"
  onClick={(e) => {
    e.stopPropagation();
    onClose();
  }}
  aria-label="Close"
>

// After
<button
  className="absolute top-2 right-2 bg-white rounded-full p-1 hover:bg-white transition-all group shadow-md hover:shadow-lg"
  style={{ zIndex: 50 }}
  onClick={(e) => {
    e.stopPropagation();
    onClose();
  }}
  aria-label="Close"
>
```

**Change 3: Layout restructure (lines 101-121)**
```tsx
// Before - Badge in same row as name
<div className="flex items-start justify-between gap-2 mb-1">
  <div className="flex-1 min-w-0">
    <h3>...</h3>
    <p>...</p>
  </div>
  {/* No Tee Times Badge here - competes with close button */}
</div>

// After - Badge in separate row
<div className="flex items-start gap-2 mb-1">
  <div className="flex-1 min-w-0">
    <h3>...</h3>
    <p>...</p>
  </div>
</div>

{/* No Tee Times Badge - Separate Row */}
{hasBookingProvider(course.provider) && ... && (
  <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 rounded flex-shrink-0 mb-1 w-fit">
    ...
  </div>
)}
```

### File 2: `app/golf/components/cards/ExpandedCardFullscreen.tsx` (lines 89-101)

```tsx
// Before
<button
  className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-all group"
  onClick={(e) => {
    e.stopPropagation();
    onClose();
  }}
  aria-label="Close"
>

// After
<button
  className="absolute top-2 right-2 bg-white rounded-full p-1.5 hover:bg-white transition-all group shadow-md hover:shadow-lg"
  style={{ zIndex: 50 }}
  onClick={(e) => {
    e.stopPropagation();
    onClose();
  }}
  aria-label="Close"
>
```

## Changes Made

| Property | Before | After | Why |
|----------|--------|-------|-----|
| Background | `bg-white/90` (90% opacity) | `bg-white` (100% opacity) | Prevents text from showing through |
| Backdrop blur | `backdrop-blur-sm` | Removed | Not needed with solid background |
| Z-index | `z-10` (Tailwind class) | `zIndex: 50` (inline style) | Ensures button is always on top |
| Shadow | None | `shadow-md hover:shadow-lg` | Creates visual separation |

## Visual Improvements

**Before:**
- Button blended with content
- Text visible through semi-transparent background
- No clear visual hierarchy

**After:**
- ✅ Button clearly separated from content
- ✅ Solid white background blocks text
- ✅ Shadow creates depth and separation
- ✅ Always on top with z-index 50

## Testing Checklist

- [x] Button visible on all card types
- [x] No content overlapping button
- [x] Button clickable in all scenarios
- [x] Shadow provides clear visual separation
- [x] Hover state works correctly
- [x] Works in both inline and fullscreen modes

## Related Files
- `ExpandedCardInline.tsx` - Inline mode expanded card
- `ExpandedCardFullscreen.tsx` - Fullscreen mode expanded card
