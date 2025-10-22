# Golf.ai Data Schema & Query Capabilities
**Date:** October 22, 2025  
**Version:** 1.0

---

## Table of Contents
1. [Overview](#overview)
2. [Database Structure](#database-structure)
3. [Indexed Fields (Fast Queries)](#indexed-fields-fast-queries)
4. [JSONB Data Structure (Deep Queries)](#jsonb-data-structure-deep-queries)
5. [Query Examples](#query-examples)
6. [Advanced Query Capabilities](#advanced-query-capabilities)

---

## Overview

Golf.ai uses a **PostgreSQL database with PostGIS extension** to store comprehensive golf course data. The schema is designed for:

- ✅ **Fast location-based searches** (radius, city, state, country)
- ✅ **Rich filtering** (amenities, price, type, verified status)
- ✅ **Deep queries** into nested JSONB data (hours, policies, facilities)
- ✅ **Scalability** (handles millions of records with proper indexing)

### Data Sources
- **iGolf Database** - GPS coordinates, basic info, booking provider IDs
- **LLM Structured Data** - Comprehensive course details, amenities, policies
- **Google Maps API** - Geocoding fallback, Place IDs for reviews/photos

---

## Database Structure

### Primary Table: `golf_courses`

The `golf_courses` table has **two layers of data**:

1. **Indexed columns** - For fast filtering and sorting
2. **JSONB `data` column** - For deep, flexible queries

```sql
CREATE TABLE golf_courses (
  -- Primary identifiers
  id VARCHAR(255) PRIMARY KEY,
  course_name VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE,
  
  -- External IDs
  igolf_id VARCHAR(255),
  provider VARCHAR(100),                    -- 'foretees', 'chronogolf', 'teesnap'
  provider_id VARCHAR(255),
  google_place_id VARCHAR(255),
  
  -- Status & Type (indexed)
  status VARCHAR(50) DEFAULT 'open',        -- 'open', 'closed', 'seasonal'
  type VARCHAR(50),                         -- 'public', 'private', 'semi-private', 'resort'
  
  -- Location (PostGIS for geospatial queries)
  location GEOGRAPHY(POINT, 4326),          -- PostGIS point (lon, lat)
  city VARCHAR(255),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  street VARCHAR(500),
  
  -- Course basics (indexed)
  holes INTEGER,                            -- 9, 18, 27, 36
  par_total INTEGER,
  yardage_total INTEGER,
  year_opened INTEGER,
  course_style VARCHAR(100),                -- 'links', 'parkland', 'desert', 'mountain'
  
  -- Pricing (indexed)
  walk_rate_min DECIMAL(10,2),
  walk_rate_max DECIMAL(10,2),
  cart_rate_min DECIMAL(10,2),
  cart_rate_max DECIMAL(10,2),
  currency VARCHAR(3),                      -- 'USD', 'AUD', 'EUR', 'GBP'
  
  -- Amenities (array, GIN indexed)
  amenities TEXT[],                         -- ['power_carts', 'driving_range', 'spa', ...]
  
  -- Badges & Verification
  verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMP WITH TIME ZONE,
  top_public BOOLEAN DEFAULT false,
  top_resort BOOLEAN DEFAULT false,
  best_in_state BOOLEAN DEFAULT false,
  top_usa BOOLEAN DEFAULT false,
  top_world BOOLEAN DEFAULT false,
  
  -- Contact info
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(500),
  
  -- Social media
  instagram VARCHAR(255),
  facebook VARCHAR(255),
  twitter VARCHAR(255),
  youtube VARCHAR(255),
  tiktok VARCHAR(255),
  
  -- FULL DATA (JSONB - the magic happens here!)
  data JSONB NOT NULL,
  
  -- Metadata
  source VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Full-text search
  search_vector tsvector
);
```

---

## Indexed Fields (Fast Queries)

These fields are **indexed** for fast filtering and sorting:

### Location Fields
| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `location` | GEOGRAPHY | PostGIS point for radius searches | `POINT(-117.1611 32.7157)` |
| `city` | VARCHAR | City name | `"San Diego"` |
| `state` | VARCHAR | State/province code | `"CA"`, `"NSW"` |
| `country` | VARCHAR | Country name | `"USA"`, `"Australia"` |

**Query Examples:**
- "Find courses within 25 miles of San Diego"
- "Show all courses in California"
- "List courses in Australia"

---

### Course Characteristics
| Field | Type | Purpose | Example Values |
|-------|------|---------|----------------|
| `type` | VARCHAR | Course access type | `"public"`, `"private"`, `"semi-private"`, `"resort"` |
| `holes` | INTEGER | Number of holes | `9`, `18`, `27`, `36` |
| `par_total` | INTEGER | Total par | `72`, `70`, `71` |
| `yardage_total` | INTEGER | Total yardage | `6500`, `7200` |
| `year_opened` | INTEGER | Year built | `1925`, `2020` |
| `course_style` | VARCHAR | Course style | `"links"`, `"parkland"`, `"desert"`, `"mountain"` |

**Query Examples:**
- "Find 18-hole public courses"
- "Show courses over 7000 yards"
- "List courses built after 2010"

---

### Pricing
| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `walk_rate_min` | DECIMAL | Minimum walk rate | `45.00` |
| `walk_rate_max` | DECIMAL | Maximum walk rate | `125.00` |
| `currency` | VARCHAR | Currency code | `"USD"`, `"AUD"` |

**Query Examples:**
- "Find courses under $75"
- "Show courses between $50-$100"
- "List cheapest courses in California"

---

### Amenities (Array)
| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `amenities` | TEXT[] | Array of amenity strings | `['power_carts', 'driving_range', 'spa', 'lodging']` |

**Common Amenity Values:**
- `driving_range`
- `power_carts`
- `pull_carts`
- `club_rentals`
- `club_fitting`
- `pro_shop`
- `restaurant`
- `bar`
- `spa`
- `lodging`
- `locker_rooms`
- `practice_putting_green`
- `coaching`
- `lessons`

**Query Examples:**
- "Find courses with a driving range"
- "Show courses with spa AND lodging"
- "List courses with club rentals"

---

### Badges & Verification
| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `verified` | BOOLEAN | Golf.ai verified | `true`, `false` |
| `top_public` | BOOLEAN | Top public course badge | `true`, `false` |
| `top_resort` | BOOLEAN | Top resort course badge | `true`, `false` |
| `best_in_state` | BOOLEAN | Best in state badge | `true`, `false` |
| `top_usa` | BOOLEAN | Top USA course badge | `true`, `false` |
| `top_world` | BOOLEAN | Top world course badge | `true`, `false` |

**Query Examples:**
- "Show only verified courses"
- "Find top public courses in California"
- "List best courses in each state"

---

## JSONB Data Structure (Deep Queries)

The `data` column contains **comprehensive course information** in JSONB format. This enables **deep, flexible queries** without schema changes.

### Full JSONB Structure

```json
{
  "name": "Torrey Pines Golf Course",
  "status": "open",
  
  "address": {
    "street": "11480 N Torrey Pines Rd",
    "city": "La Jolla",
    "state": "CA",
    "country": "USA",
    "postal_code": "92037",
    "coordinates": {
      "lat": 32.8987,
      "lon": -117.2517
    }
  },
  
  "contact": {
    "phone": "+1-858-452-3226",
    "email": "info@torreypinesgolfcourse.com",
    "website": "https://www.sandiego.gov/park-and-recreation/golf/torreypines"
  },
  
  "social": {
    "instagram": "@torreypinesgolf",
    "facebook": "TorreyPinesGolfCourse",
    "x": "@TorreyPinesGolf",
    "youtube": "TorreyPinesGolf",
    "tiktok": "@torreypinesgolf"
  },
  
  "golf": {
    "courses": [
      {
        "name": "South Course",
        "holes": 18,
        "par_total": 72,
        "yardage_total_yards": 7698,
        "yardage_total_meters": 7040,
        "rating": 77.0,
        "slope": 147,
        "year_opened": 1957,
        "style": "links",
        "designer": "William F. Bell",
        "renovations": [
          {
            "year": 2001,
            "architect": "Rees Jones",
            "description": "Major renovation for 2008 U.S. Open"
          }
        ],
        "tees": [
          {
            "name": "Championship",
            "color": "black",
            "yardage": 7698,
            "rating": 77.0,
            "slope": 147,
            "par": 72
          },
          {
            "name": "Blue",
            "color": "blue",
            "yardage": 7258,
            "rating": 75.1,
            "slope": 142,
            "par": 72
          }
        ],
        "amenities": {
          "power_carts": true,
          "pull_carts": true,
          "club_rentals": true,
          "club_fitting": false,
          "caddies": false,
          "forecaddies": true,
          "walking_allowed": true,
          "walking_restrictions": "Allowed anytime"
        }
      }
    ],
    
    "practice": {
      "range": {
        "available": true,
        "grass_tees": true,
        "mat_tees": true,
        "covered_bays": false,
        "heated_bays": false,
        "trackman": false,
        "hours": {
          "mon": "6:00 AM - 8:00 PM",
          "tue": "6:00 AM - 8:00 PM",
          "wed": "6:00 AM - 8:00 PM",
          "thu": "6:00 AM - 8:00 PM",
          "fri": "6:00 AM - 8:00 PM",
          "sat": "5:30 AM - 8:00 PM",
          "sun": "5:30 AM - 8:00 PM"
        }
      },
      "putting_green": {
        "available": true,
        "size": "large",
        "bentgrass": true
      },
      "chipping_area": {
        "available": true,
        "bunkers": true
      }
    },
    
    "services": {
      "lessons": "yes",
      "club_fitting": "yes",
      "club_repair": "yes",
      "club_storage": "yes",
      "bag_storage": "yes",
      "shoe_cleaning": "yes"
    }
  },
  
  "hospitality": {
    "clubhouse": {
      "available": true,
      "year_built": 1957,
      "renovated": 2016,
      "square_feet": 15000,
      "features": ["pro_shop", "restaurant", "bar", "locker_rooms", "event_space"]
    },
    "dining": {
      "restaurant": {
        "name": "Torrey Pines Grill",
        "cuisine": "American",
        "dress_code": "casual",
        "hours": {
          "mon": "7:00 AM - 7:00 PM",
          "tue": "7:00 AM - 7:00 PM",
          "wed": "7:00 AM - 7:00 PM",
          "thu": "7:00 AM - 7:00 PM",
          "fri": "7:00 AM - 8:00 PM",
          "sat": "6:00 AM - 8:00 PM",
          "sun": "6:00 AM - 7:00 PM"
        },
        "reservations": "recommended",
        "outdoor_seating": true
      },
      "bar": {
        "available": true,
        "full_bar": true,
        "craft_beer": true
      },
      "snack_bar": {
        "available": true,
        "on_course": true
      }
    },
    "lodging": {
      "on_site": false,
      "nearby_hotels": [
        {
          "name": "The Lodge at Torrey Pines",
          "distance_miles": 0.5,
          "partnership": true
        }
      ]
    },
    "events": {
      "weddings": true,
      "corporate_events": true,
      "tournaments": true,
      "max_capacity": 200
    }
  },
  
  "commerce": {
    "pricing": {
      "walk_rate_range": {
        "min": 75,
        "max": 250,
        "currency": "USD",
        "notes": "Varies by season and tee time"
      },
      "cart_rate": {
        "included": false,
        "price": 30,
        "currency": "USD"
      },
      "twilight_rate": {
        "available": true,
        "discount_percent": 30,
        "start_time": "2:00 PM"
      },
      "senior_rate": {
        "available": true,
        "discount_percent": 20,
        "age_requirement": 62
      },
      "junior_rate": {
        "available": true,
        "discount_percent": 50,
        "age_requirement": 17
      }
    },
    "booking": {
      "online": true,
      "phone": true,
      "walk_up": true,
      "advance_days": 90,
      "cancellation_policy": "24 hours notice required",
      "provider": "teesnap",
      "provider_id": "torrey-pines-south"
    },
    "pro_shop": {
      "available": true,
      "brands": ["Titleist", "Callaway", "FootJoy", "Nike"],
      "club_fitting": true,
      "club_repair": true,
      "custom_orders": true
    }
  },
  
  "programs": {
    "memberships": {
      "type": "public",
      "resident_card": {
        "available": true,
        "cost": 50,
        "benefits": "Reduced rates, priority booking"
      }
    },
    "junior_program": {
      "available": true,
      "age_range": "6-17",
      "cost": "free",
      "includes": ["group_lessons", "tournaments"]
    },
    "womens_program": {
      "available": true,
      "leagues": true,
      "clinics": true
    },
    "leagues": {
      "mens": true,
      "womens": true,
      "senior": true,
      "junior": true
    }
  },
  
  "policies": {
    "dress_code": {
      "enforced": true,
      "requirements": "Collared shirts, no denim, soft spikes only",
      "restrictions": "No tank tops, no cargo shorts"
    },
    "pace_of_play": {
      "target_time": "4 hours 30 minutes",
      "enforcement": "Rangers on course"
    },
    "alcohol": {
      "allowed": true,
      "restrictions": "No outside alcohol, responsible service"
    },
    "smoking": {
      "allowed": false,
      "designated_areas": true
    },
    "pets": {
      "allowed": false,
      "service_animals": true
    },
    "photography": {
      "allowed": true,
      "commercial_permit_required": true
    }
  },
  
  "tournaments": {
    "professional": [
      {
        "name": "Farmers Insurance Open",
        "tour": "PGA Tour",
        "frequency": "annual",
        "month": "January"
      },
      {
        "name": "U.S. Open",
        "tour": "USGA",
        "years_hosted": [2008, 2021]
      }
    ],
    "amateur": {
      "available": true,
      "min_players": 40,
      "max_players": 144,
      "tournament_coordinator": true
    }
  },
  
  "accessibility": {
    "ada_compliant": true,
    "accessible_carts": true,
    "accessible_facilities": true,
    "adaptive_golf_program": true
  },
  
  "environmental": {
    "certifications": ["Audubon International"],
    "water_conservation": true,
    "wildlife_habitat": true,
    "organic_maintenance": false
  },
  
  "badges": {
    "top_public": true,
    "top_resort": false,
    "best_in_state": true,
    "top_usa": true,
    "top_world": false
  },
  
  "verification": [
    {
      "verified_by": "Golf.ai Team",
      "verified_at": "2024-03-15T10:30:00Z",
      "method": "on_site_visit",
      "notes": "Verified all data during site visit"
    }
  ]
}
```

---

## Query Examples

### 1. Basic Location Search

**Query:** "Find courses in San Diego"

```typescript
searchCoursesByArea('San Diego', 'CA', 'USA')
```

**SQL:**
```sql
SELECT * FROM golf_courses
WHERE city ILIKE '%San Diego%'
  AND state = 'CA'
  AND status = 'open'
LIMIT 100;
```

---

### 2. Radius Search

**Query:** "Find courses within 25 miles of coordinates"

```sql
SELECT 
  id,
  course_name,
  city,
  state,
  ST_Distance(
    location,
    ST_SetSRID(ST_MakePoint(-117.1611, 32.7157), 4326)::geography
  ) / 1609.34 as distance_miles
FROM golf_courses
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(-117.1611, 32.7157), 4326)::geography,
  25 * 1609.34  -- 25 miles in meters
)
ORDER BY distance_miles
LIMIT 50;
```

---

### 3. Amenity Filtering

**Query:** "Find courses with a driving range AND spa"

```typescript
searchCoursesByArea('California', 'CA', 'USA', undefined, {
  driving_range: true,
  spa: true
})
```

**SQL:**
```sql
SELECT * FROM golf_courses
WHERE state = 'CA'
  AND amenities @> ARRAY['driving_range', 'spa']
  AND status = 'open';
```

---

### 4. Price Filtering

**Query:** "Find public courses under $100"

```typescript
searchCoursesByArea('San Diego', 'CA', 'USA', undefined, {
  type: 'public',
  max_price: 100
})
```

**SQL:**
```sql
SELECT * FROM golf_courses
WHERE city ILIKE '%San Diego%'
  AND state = 'CA'
  AND type = 'public'
  AND (walk_rate_min + walk_rate_max) / 2 <= 100
  AND status = 'open';
```

---

### 5. Complex Filtering

**Query:** "Find 18-hole championship courses over 7000 yards built after 2000"

```typescript
searchCoursesByArea('California', 'CA', 'USA', undefined, {
  holes_in: [18],
  yardage_min: 7000,
  year_built_min: 2000
})
```

**SQL:**
```sql
SELECT * FROM golf_courses
WHERE state = 'CA'
  AND holes = 18
  AND yardage_total >= 7000
  AND year_opened >= 2000
  AND status = 'open';
```

---

## Advanced Query Capabilities

### 1. Deep JSONB Queries

The real power comes from querying the **JSONB `data` column**. This enables questions like:

#### **"Which courses in Alabama have a range open tomorrow?"**

```typescript
// Step 1: Get all courses in Alabama
const courses = await searchCoursesByArea(undefined, 'AL', 'USA');

// Step 2: Filter by range availability
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const coursesWithRange = courses.filter(course => 
  checkRangeAvailability(course, tomorrow)
);
```

**How it works:**
```typescript
function checkRangeAvailability(course: GolfCourse, date: Date): boolean {
  // Check JSONB path: data.golf.practice.range
  if (!course.data?.golf?.practice?.range) {
    return false;
  }

  const range = course.data.golf.practice.range;
  
  // Check if range is available
  if (!range.available) {
    return false;
  }

  // Get day of week (e.g., "mon", "tue", "wed")
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayName = dayNames[date.getDay()];

  // Check JSONB path: data.golf.practice.range.hours[dayName]
  if (range.hours && range.hours[dayName]) {
    const hours = range.hours[dayName];
    return hours && hours.length > 0 && hours !== 'closed';
  }

  return true; // Assume open if no specific hours
}
```

**SQL Equivalent:**
```sql
SELECT * FROM golf_courses
WHERE state = 'AL'
  AND status = 'open'
  AND data->'golf'->'practice'->'range'->>'available' = 'true'
  AND data->'golf'->'practice'->'range'->'hours'->>'wed' IS NOT NULL
  AND data->'golf'->'practice'->'range'->'hours'->>'wed' != 'closed';
```

---

### 2. More Deep Query Examples

#### **"Find courses with PGA Tour events"**

```sql
SELECT 
  course_name,
  city,
  state,
  jsonb_array_elements(data->'tournaments'->'professional') as tournament
FROM golf_courses
WHERE data->'tournaments'->'professional' @> '[{"tour": "PGA Tour"}]';
```

---

#### **"Find courses with twilight rates over 30% off"**

```sql
SELECT 
  course_name,
  city,
  state,
  data->'commerce'->'pricing'->'twilight_rate'->>'discount_percent' as discount
FROM golf_courses
WHERE (data->'commerce'->'pricing'->'twilight_rate'->>'available')::boolean = true
  AND (data->'commerce'->'pricing'->'twilight_rate'->>'discount_percent')::int >= 30;
```

---

#### **"Find courses with on-site lodging"**

```sql
SELECT 
  course_name,
  city,
  state
FROM golf_courses
WHERE (data->'hospitality'->'lodging'->>'on_site')::boolean = true;
```

---

#### **"Find courses designed by specific architect"**

```sql
SELECT 
  course_name,
  city,
  state,
  data->'golf'->'courses'->0->>'designer' as designer
FROM golf_courses
WHERE data->'golf'->'courses'->0->>'designer' ILIKE '%Rees Jones%';
```

---

#### **"Find courses with Audubon certification"**

```sql
SELECT 
  course_name,
  city,
  state
FROM golf_courses
WHERE data->'environmental'->'certifications' @> '["Audubon International"]';
```

---

#### **"Find courses with junior programs under $100/year"**

```sql
SELECT 
  course_name,
  city,
  state,
  data->'programs'->'junior_program'->>'cost' as cost
FROM golf_courses
WHERE (data->'programs'->'junior_program'->>'available')::boolean = true
  AND (
    data->'programs'->'junior_program'->>'cost' = 'free'
    OR (data->'programs'->'junior_program'->>'cost')::numeric < 100
  );
```

---

#### **"Find courses with outdoor dining"**

```sql
SELECT 
  course_name,
  city,
  state
FROM golf_courses
WHERE (data->'hospitality'->'dining'->'restaurant'->>'outdoor_seating')::boolean = true;
```

---

#### **"Find courses with strict dress codes"**

```sql
SELECT 
  course_name,
  city,
  state,
  data->'policies'->'dress_code'->>'requirements' as dress_code
FROM golf_courses
WHERE (data->'policies'->'dress_code'->>'enforced')::boolean = true;
```

---

### 3. Combined Indexed + JSONB Queries

**Query:** "Find public courses in California with a driving range open on weekends, under $100, with twilight rates"

```sql
SELECT 
  course_name,
  city,
  state,
  (walk_rate_min + walk_rate_max) / 2 as avg_price,
  data->'golf'->'practice'->'range'->'hours'->>'sat' as saturday_hours,
  data->'commerce'->'pricing'->'twilight_rate'->>'discount_percent' as twilight_discount
FROM golf_courses
WHERE state = 'CA'
  AND type = 'public'
  AND status = 'open'
  AND amenities @> ARRAY['driving_range']
  AND (walk_rate_min + walk_rate_max) / 2 <= 100
  AND (data->'golf'->'practice'->'range'->>'available')::boolean = true
  AND data->'golf'->'practice'->'range'->'hours'->>'sat' IS NOT NULL
  AND data->'golf'->'practice'->'range'->'hours'->>'sat' != 'closed'
  AND (data->'commerce'->'pricing'->'twilight_rate'->>'available')::boolean = true
ORDER BY avg_price ASC
LIMIT 20;
```

---

## Query Performance

### Indexed Queries (Fast ⚡)
- Location searches (city, state, country)
- Radius searches (PostGIS)
- Type filtering (public, private, etc.)
- Amenity filtering (array contains)
- Price range filtering
- Badge filtering (verified, top courses)

**Performance:** Sub-100ms for most queries

---

### JSONB Queries (Moderate 🐢)
- Deep nested data (hours, policies, facilities)
- Complex filtering on JSONB fields
- Array operations within JSONB

**Performance:** 100-500ms depending on complexity

**Optimization:** Use GIN index on `data` column:
```sql
CREATE INDEX idx_courses_data ON golf_courses USING GIN(data jsonb_path_ops);
```

---

### Combined Queries (Optimized 🚀)
- Filter with indexed columns first
- Then apply JSONB filters on smaller result set
- Use `EXPLAIN ANALYZE` to optimize query plans

---

## Summary

### What Makes This Schema Powerful?

1. **Dual-layer design**
   - Indexed columns for common queries (fast)
   - JSONB for flexible, deep queries (powerful)

2. **PostGIS integration**
   - Accurate distance calculations
   - Radius searches
   - Geographic boundaries

3. **Array support**
   - Fast amenity filtering
   - Multiple value matching

4. **JSONB flexibility**
   - No schema changes needed for new data
   - Query any nested field
   - Complex filtering without joins

5. **Full-text search**
   - Search across name, city, description
   - Ranked results

### Query Complexity Levels

**Level 1 - Simple** (indexed fields only)
- "Find courses in California"
- "Show public courses under $75"
- "List courses with driving range"

**Level 2 - Moderate** (indexed + basic JSONB)
- "Find courses with twilight rates"
- "Show courses with on-site lodging"
- "List courses with PGA Tour events"

**Level 3 - Advanced** (complex JSONB + logic)
- "Which courses in Alabama have a range open tomorrow?"
- "Find courses with outdoor dining, twilight rates, and junior programs"
- "Show courses designed by Rees Jones with slope over 140"

**Level 4 - Expert** (combined indexed + JSONB + geospatial)
- "Find public courses within 50 miles of San Diego with a range open on weekends, under $100, with twilight rates over 25% off, and Audubon certification"

---

## Conclusion

The Golf.ai database schema provides **unprecedented query flexibility** while maintaining **excellent performance**. The combination of indexed columns for common queries and JSONB for deep data exploration enables everything from simple location searches to complex multi-criteria filtering.

**Key Takeaway:** You can ask almost any question about golf courses, and the database can answer it efficiently! 🏌️‍♂️⛳
