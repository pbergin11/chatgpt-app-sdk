# Golf.ai MCP Tools - Quick Reference Guide

## Tool: `search_courses_by_area`

### When to use
- User wants to find golf courses by location
- User asks about courses in a city, state, or country
- User wants filtered results (price, amenities, etc.)

### Location Formats

#### USA - State Only
```json
{ "state": "CA" }
{ "state": "FL" }
{ "state": "TX" }
```

#### USA - City + State
```json
{ "city": "San Diego", "state": "CA" }
{ "city": "Phoenix", "state": "AZ" }
{ "city": "Miami", "state": "FL" }
```

#### International - Country Only
```json
{ "country": "Australia" }
{ "country": "United Kingdom" }
{ "country": "Canada" }
```

#### International - City + Country
```json
{ "city": "Sydney", "country": "Australia" }
{ "city": "London", "country": "United Kingdom" }
{ "city": "Toronto", "country": "Canada" }
```

### Common Queries

| User Query | Tool Args |
|------------|-----------|
| "Golf courses in San Diego" | `{ city: "San Diego", state: "CA" }` |
| "All California courses" | `{ state: "CA" }` |
| "Courses near Phoenix" | `{ city: "Phoenix", state: "AZ" }` |
| "Courses in Australia" | `{ country: "Australia" }` |
| "Golf courses in Sydney" | `{ city: "Sydney", country: "Australia" }` |
| "Courses within 50 miles of LA" | `{ city: "Los Angeles", state: "CA", radius: 50 }` |

### Filters Examples

#### Price Filters
```json
{
  "city": "San Diego",
  "state": "CA",
  "filters": {
    "max_price": 100,
    "sort_by": "cheapest"
  }
}
```

#### Amenity Filters
```json
{
  "state": "CA",
  "filters": {
    "driving_range": true,
    "spa": true,
    "lodging": true
  }
}
```

#### Course Attributes
```json
{
  "country": "Scotland",
  "filters": {
    "holes_in": [18],
    "yardage_min": 7000,
    "type": "public"
  }
}
```

#### Date/Time Availability
```json
{
  "city": "Phoenix",
  "state": "AZ",
  "filters": {
    "date": "2025-10-25",
    "start_time": "08:00",
    "end_time": "12:00"
  }
}
```

---

## Tool: `get_course_details`

### When to use
- User asks about a specific course
- User wants detailed information (rates, amenities, policies)
- User has a course ID from previous search

### Search Options

#### By Course ID (Preferred)
```json
{ "courseId": "torrey-pines-south" }
{ "courseId": "pebble-beach" }
{ "courseId": "augusta-national" }
```

#### By Name + State (USA)
```json
{ "name": "Torrey Pines", "state": "CA" }
{ "name": "Pebble Beach", "state": "CA" }
{ "name": "Pinehurst", "state": "NC" }
```

#### By Name + Country (International)
```json
{ "name": "St Andrews", "country": "Scotland" }
{ "name": "Royal Melbourne", "country": "Australia" }
{ "name": "Carnoustie", "country": "Scotland" }
```

### Common Queries

| User Query | Tool Args |
|------------|-----------|
| "Tell me about Pebble Beach" | `{ name: "Pebble Beach", state: "CA" }` |
| "What are the rates at Torrey Pines?" | `{ name: "Torrey Pines", state: "CA" }` |
| "Does Augusta allow walking?" | `{ name: "Augusta National", state: "GA" }` |
| "Info on St Andrews" | `{ name: "St Andrews", country: "Scotland" }` |
| "Details for course ID xyz" | `{ courseId: "xyz" }` |

---

## Tool: `book_tee_time`

### When to use
- User wants to book a tee time
- User asks about booking availability
- User wants a booking link

### Required
```json
{ "courseId": "torrey-pines-south" }
```

### Optional
```json
{
  "courseId": "torrey-pines-south",
  "date": "2025-10-25",
  "time": "08:30",
  "players": 4
}
```

### Common Queries

| User Query | Tool Args |
|------------|-----------|
| "Book a tee time at Pebble Beach" | `{ courseId: "pebble-beach" }` |
| "Book for 4 players tomorrow at 9am" | `{ courseId: "xyz", date: "2025-10-23", time: "09:00", players: 4 }` |
| "How do I book at Torrey Pines?" | `{ courseId: "torrey-pines-south" }` |

---

## Filter Reference

### Course Type
- `"public"` - Open to public
- `"private"` - Members only
- `"semi-private"` - Limited public access
- `"resort"` - Resort course

### Sort Options
- `"cheapest"` - Lowest price first
- `"most_expensive"` - Highest price first
- `"longest"` - Most yardage first
- `"shortest"` - Least yardage first
- `"newest"` - Recently built
- `"oldest"` - Historic courses
- `"highest_rated"` - Best rated

### Amenities (Boolean)
- `driving_range`
- `putting_green`
- `club_rentals`
- `spa`
- `lodging`
- `restaurant`
- `bar`
- `pro_shop`
- `locker_rooms`
- `golf_lessons`
- `event_space`
- `practice_bunker`
- `chipping_green`

### Time Windows
- `"morning"` - Early tee times
- `"midday"` - Mid-day times
- `"afternoon"` - Afternoon times
- `"twilight"` - Evening times

### Relative Dates
- `"today"`
- `"tomorrow"`
- `"this_saturday"`
- `"this_sunday"`
- `"next_saturday"`
- `"next_sunday"`
- `"this_weekend"`
- `"next_weekend"`

---

## Response Structure

### search_courses_by_area Response
```json
{
  "content": [{ "type": "text", "text": "Found 15 courses..." }],
  "structuredContent": {
    "courses": [
      {
        "id": "torrey-pines-south",
        "name": "Torrey Pines Golf Course - South",
        "city": "La Jolla",
        "state": "CA",
        "country": "USA",
        "type": "public",
        "lon": -117.2517,
        "lat": 32.8987,
        "holes": 18,
        "par": 72,
        "yardage": 7698,
        "average_price": 162.5,
        "rating_stars": 4.5,
        "amenities": ["driving_range", "pro_shop", "restaurant"],
        "verified": true
      }
    ],
    "searchContext": {
      "city": "San Diego",
      "state": "CA",
      "radius": 25,
      "total_results": 15
    }
  }
}
```

### get_course_details Response
```json
{
  "content": [{ "type": "text", "text": "Torrey Pines is a public..." }],
  "structuredContent": {
    "course": {
      "id": "torrey-pines-south",
      "name": "Torrey Pines Golf Course - South",
      "data": {
        "golf": {
          "courses": [...],
          "practice": {
            "range": {
              "available": true,
              "hours": {
                "mon": "6:00 AM - 8:00 PM",
                "tue": "6:00 AM - 8:00 PM"
              }
            }
          }
        },
        "commerce": {
          "pricing": {
            "walk_rate_range": { "min": 75, "max": 250 }
          }
        }
      }
    }
  }
}
```

---

## Best Practices

### 1. Use State/Country Correctly
✅ **USA:** `state: "CA"`  
❌ **USA:** `country: "USA"`

✅ **International:** `country: "Australia"`  
❌ **International:** `state: "NSW"`

### 2. Default Radius
- City searches automatically use 25-mile radius
- Override with `radius` parameter if needed
- State/country searches don't use radius

### 3. Course Lookup
- Use `courseId` if you have it (faster, more accurate)
- Use `name` + `state`/`country` for disambiguation
- Partial name matching supported

### 4. Filters
- Combine multiple filters for precise results
- Use `sort_by` to order results
- Use `date` filters for availability checks

---

## Error Handling

### No location provided
```json
{
  "content": [{ "type": "text", "text": "Please provide at least one location parameter..." }],
  "isError": true
}
```

### State AND country provided
```json
{
  "content": [{ "type": "text", "text": "Please provide either 'state' (for USA) or 'country' (for international), not both." }],
  "isError": true
}
```

### Course not found
```json
{
  "content": [{ "type": "text", "text": "Could not find a course matching 'xyz'..." }],
  "isError": true
}
```
