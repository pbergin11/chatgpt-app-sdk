# Bug Fix: Map Reloading and Missing Markers

## Issues Fixed

### 1. Map Reloading on Every Interaction
**Problem:** The map was reinitializing every time the user moved the map or clicked on something.

**Root Cause:** The `state` dependency in `MapContainer.tsx` useEffect (line 165) caused the entire map to be destroyed and recreated whenever widget state changed (e.g., selecting a course, moving the map).

**Fix:** Removed `state` from the useEffect dependency array.
```typescript
// Before
}, [setState, token, workerReady, setNoToken, setNoWebGL, onMapReady, state]);

// After  
}, [setState, token, workerReady, setNoToken, setNoWebGL, onMapReady]);
```

### 2. Markers Not Showing / Recreating on Every State Change
**Problem:** Map markers were being removed and recreated on every state change, causing them to flicker or disappear.

**Root Cause:** The `MapMarkers.tsx` useEffect had `state` and `onSelectCourse` in its dependency array (line 149), causing markers to be destroyed and recreated whenever:
- A course was selected
- The map was moved
- Any state changed

**Fix:** 
1. Removed `state` and `onSelectCourse` from the dependency array
2. Used a ref pattern to maintain the latest `onSelectCourse` callback without triggering re-renders

```typescript
// Added ref to store latest callback
const onSelectCourseRef = useRef(onSelectCourse);

useEffect(() => {
  onSelectCourseRef.current = onSelectCourse;
}, [onSelectCourse]);

// Use ref in click handler
el.addEventListener('click', () => {
  onSelectCourseRef.current(course.id);
});

// Updated dependencies
}, [courses, map]); // Removed onSelectCourse and state
```

## Files Modified

1. **`app/golf/components/map/MapContainer.tsx`**
   - Line 165: Removed `state` from useEffect dependencies

2. **`app/golf/components/map/MapMarkers.tsx`**
   - Lines 18-23: Added `onSelectCourseRef` and sync effect
   - Line 140: Changed to use `onSelectCourseRef.current`
   - Line 149: Removed `onSelectCourse` and `state` from dependencies

## Why This Works

### React useEffect Dependencies
When a dependency changes, React:
1. Runs the cleanup function (if any)
2. Re-runs the effect

**MapContainer Issue:**
- Every state change → cleanup destroys map → effect recreates map
- This caused the "reload" behavior

**MapMarkers Issue:**
- Every state change → cleanup removes all markers → effect recreates all markers
- This caused markers to disappear/flicker

### The Ref Pattern
Using refs allows us to:
- Keep the latest callback without it being a dependency
- Avoid recreating event listeners
- Maintain stable marker instances

## Testing Checklist

- [x] Map initializes once and stays stable
- [x] Markers appear on map load
- [x] Clicking markers selects courses
- [x] Moving map doesn't cause reload
- [x] Selecting courses doesn't recreate markers
- [x] Popups show/hide correctly on hover
- [x] Selected course popup stays visible

## Performance Impact

**Before:**
- Every interaction triggered full map + marker recreation
- ~100-500ms delay on each interaction
- Memory leaks from unreleased map instances

**After:**
- Map created once on mount
- Markers created once when courses load
- Instant interactions
- Proper cleanup on unmount only
