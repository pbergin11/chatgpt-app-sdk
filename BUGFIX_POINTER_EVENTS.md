# Bug Fix: Map Not Clickable Behind Expanded Cards

## Issue
When a course card was expanded, the map area above the card's height was not clickable. Users couldn't:
- Click on map markers
- Drag/pan the map
- Interact with map controls

Even though the map was visible in that area, all pointer events were being blocked by the card container.

## Root Cause
The bottom course cards container had an implicit `pointer-events: auto` (default behavior) that covered the entire bottom portion of the screen, even in areas where there was no visible card content.

```
┌─────────────────────────────┐
│         Map (visible)       │
│    ❌ Not clickable here    │ ← Blocked by card container
├─────────────────────────────┤
│   Expanded Card (visible)   │
│    ✅ Clickable here        │
└─────────────────────────────┘
```

## Solution
Applied a CSS pointer-events pattern:
1. Set `pointer-events: none` on the outer container (makes it transparent to clicks)
2. Set `pointer-events: auto` on the scrollable inner container (re-enables clicks on actual cards)

This allows clicks to "pass through" the empty space above cards to reach the map below.

```
┌─────────────────────────────┐
│         Map (visible)       │
│    ✅ Clickable here        │ ← Clicks pass through
├─────────────────────────────┤
│   Expanded Card (visible)   │
│    ✅ Clickable here        │ ← Re-enabled on cards
└─────────────────────────────┘
```

## Code Changes

### File 1: `app/golf/page.tsx` (lines 397-404)

```tsx
// Before
<div 
  className="absolute bottom-0 left-0 right-0 z-10"
  style={{ paddingBottom: `${(safeArea?.insets?.bottom ?? 0) + 12}px` }}
>
  <div className="overflow-x-auto overflow-y-visible px-4 pb-2 scrollbar-hide">
    <div className="flex items-end gap-3 min-w-min py-2">

// After
<div 
  className="absolute bottom-0 left-0 right-0 z-10"
  style={{ 
    paddingBottom: `${(safeArea?.insets?.bottom ?? 0) + 12}px`,
    pointerEvents: 'none'  // Make entire container transparent to clicks
  }}
>
  <div className="overflow-x-auto overflow-y-visible px-4 pb-2 scrollbar-hide">
    <div className="flex items-end gap-3 min-w-min py-2">
      {/* Cards will have pointer-events: auto individually */}
```

**Key:** Set `pointer-events: none` on the outer container only. Don't add it to inner containers.

### File 2: `app/golf/components/cards/CourseCard.tsx` (lines 77-81)

```tsx
// Before
style={{ 
  width: `${cardWidth}px`,
  transformOrigin: 'bottom center'
}}

// After
style={{ 
  width: `${cardWidth}px`,
  transformOrigin: 'bottom center',
  pointerEvents: 'auto'  // Re-enable clicks on cards
}}
```

**Why:** Each card needs `pointer-events: auto` to receive clicks while the space around them allows clicks to pass through to the map.

### File 3: `app/golf/components/cards/ExpandedCardInline.tsx` (line 64)

```tsx
// Before
<div className="flex gap-2 p-2 items-top">

// After  
<div className="relative flex gap-2 p-2 items-top">
```

**Why:** The close button uses `absolute` positioning and needs a `relative` parent to position correctly within the card.

## How It Works

### CSS `pointer-events` Property
- `pointer-events: none` - Element ignores all mouse/touch events (clicks pass through)
- `pointer-events: auto` - Element responds to mouse/touch events normally (default)

### Layering Strategy
```
Outer container (pointer-events: none)
  └─ Inner scrollable (inherits pointer-events: none)
      └─ Flex container (inherits pointer-events: none)
          └─ Cards (pointer-events: auto)
```

- Outer container: `pointer-events: none` - Transparent to clicks
- Inner containers: Inherit `none` - Clicks pass through
- Cards: `pointer-events: auto` - Re-enable clicks only on cards
- Space between/around cards: Clicks pass through to map

## Testing Checklist

- [x] Map is clickable above expanded cards
- [x] Map markers are clickable above expanded cards
- [x] Map can be dragged/panned above expanded cards
- [x] Cards remain fully interactive
- [x] Card scrolling still works
- [x] Card buttons and forms still work
- [x] Collapsed cards are clickable
- [x] Expanded cards are clickable

## Related Patterns

This is a common pattern for overlays and floating UI elements:
- Modal backgrounds (click-through dimmed areas)
- Tooltips (don't block underlying content)
- Floating action buttons (only button is clickable, not surrounding space)

## Performance Impact
None - CSS property change only, no JavaScript overhead.
