# Golf.ai Database Schema & Data Pipeline

## Overview

This document describes the database schema, data transformation pipeline, and geocoding requirements for the Golf.ai platform. The system is designed to efficiently store and query golf course data for the ChatGPT MCP integration.

---

## Database: PostgreSQL with PostGIS

**Why PostgreSQL?**
- **JSONB support** - Flexible storage for varying course data structures
- **PostGIS extension** - Geospatial queries (radius search, distance calculations)
- **Performance** - Handles millions of records with proper indexing
- **ACID compliance** - Data integrity for transactional operations

---

## Table Schema

### Primary Table: `golf_courses`

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE golf_courses (
  -- Primary identifiers
  id VARCHAR(255) PRIMARY KEY,                    -- Original course ID from source
  course_name VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE,                       -- URL-friendly identifier
  
  -- Additional IDs for integrations
  igolf_id VARCHAR(255),                          -- iGolf ID from external system
  provider VARCHAR(100),                          -- Booking provider name (e.g., 'foretees', 'chronogolf', 'teesnap')
  provider_id VARCHAR(255),                       -- Provider-specific course ID
  google_place_id VARCHAR(255),                   -- Google Places API ID (optional, for reviews/photos)
  
  -- Searchable/filterable fields (indexed for performance)
  status VARCHAR(50) DEFAULT 'open',              -- 'open', 'closed', 'seasonal'
  type VARCHAR(50),                               -- 'public', 'private', 'semi-private', 'resort'
  
  -- Location (PostGIS geography for accurate distance calculations)
  location GEOGRAPHY(POINT, 4326),                -- PostGIS point (lon, lat)
  city VARCHAR(255),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  street VARCHAR(500),
  
  -- Geocoding metadata
  geocode_source VARCHAR(50),                     -- 'google', 'manual', 'nominatim'
  geocode_confidence DECIMAL(3,2),                -- 0.00 to 1.00
  geocoded_at TIMESTAMP WITH TIME ZONE,
  
  -- Course basics (for quick filtering)
  holes INTEGER,                                  -- 9, 18, 27, etc.
  par_total INTEGER,
  yardage_total INTEGER,
  year_opened INTEGER,
  course_style VARCHAR(100),                      -- 'links', 'parkland', 'desert', etc.
  
  -- Pricing (for filtering and sorting)
  walk_rate_min DECIMAL(10,2),
  walk_rate_max DECIMAL(10,2),
  cart_rate_min DECIMAL(10,2),
  cart_rate_max DECIMAL(10,2),
  currency VARCHAR(3),                            -- 'USD', 'AUD', 'EUR', etc.
  
  -- Amenities (stored as array for fast GIN index queries)
  amenities TEXT[],                               -- ['power_carts', 'driving_range', 'club_house', etc.]
  
  -- Badges and verification
  verified BOOLEAN DEFAULT false,                 -- Golf.AI verified
  verification_date TIMESTAMP WITH TIME ZONE,
  top_public BOOLEAN DEFAULT false,
  top_resort BOOLEAN DEFAULT false,
  best_in_state BOOLEAN DEFAULT false,
  top_usa BOOLEAN DEFAULT false,
  top_world BOOLEAN DEFAULT false,
  
  -- Contact information (for quick access)
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(500),
  
  -- Social media
  instagram VARCHAR(255),
  facebook VARCHAR(255),
  twitter VARCHAR(255),
  youtube VARCHAR(255),
  tiktok VARCHAR(255),
  
  -- Full data (JSONB for complete flexibility)
  data JSONB NOT NULL,                            -- Complete course data structure
  
  -- Metadata
  source VARCHAR(100),                            -- 'llm_structured_v2', 'manual', etc.
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Full-text search
  search_vector tsvector                          -- For text search on name, city, etc.
);

-- Indexes for performance
CREATE INDEX idx_courses_location ON golf_courses USING GIST(location);
CREATE INDEX idx_courses_city ON golf_courses(city);
CREATE INDEX idx_courses_state ON golf_courses(state);
CREATE INDEX idx_courses_country ON golf_courses(country);
CREATE INDEX idx_courses_type ON golf_courses(type);
CREATE INDEX idx_courses_status ON golf_courses(status);
CREATE INDEX idx_courses_amenities ON golf_courses USING GIN(amenities);
CREATE INDEX idx_courses_data ON golf_courses USING GIN(data jsonb_path_ops);
CREATE INDEX idx_courses_verified ON golf_courses(verified) WHERE verified = true;
CREATE INDEX idx_courses_igolf_id ON golf_courses(igolf_id) WHERE igolf_id IS NOT NULL;
CREATE INDEX idx_courses_provider ON golf_courses(provider, provider_id) WHERE provider IS NOT NULL;
CREATE INDEX idx_courses_google_place_id ON golf_courses(google_place_id) WHERE google_place_id IS NOT NULL;
CREATE INDEX idx_courses_slug ON golf_courses(slug);
CREATE INDEX idx_courses_search ON golf_courses USING GIN(search_vector);

-- Trigger to update search_vector automatically
CREATE TRIGGER tsvector_update BEFORE INSERT OR UPDATE
ON golf_courses FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(search_vector, 'pg_catalog.english', course_name, city, state);
```

### Supporting Table: `geocode_cache`

Cache geocoding results to avoid repeated API calls and costs.

```sql
CREATE TABLE geocode_cache (
  id SERIAL PRIMARY KEY,
  
  -- Input query
  address_query VARCHAR(1000) NOT NULL,           -- Full address string
  city VARCHAR(255),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  
  -- Geocoding result
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  formatted_address VARCHAR(1000),
  google_place_id VARCHAR(255),
  
  -- Metadata
  confidence DECIMAL(3,2),                        -- 0.00 to 1.00
  source VARCHAR(50),                             -- 'google', 'nominatim', etc.
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(address_query, source)
);

CREATE INDEX idx_geocode_location ON geocode_cache(city, state, country);
CREATE INDEX idx_geocode_place_id ON geocode_cache(google_place_id);
```

---

## Data Sources

You have **two data sources** that need to be merged:

### Source 1: iGolf Database (GPS + Basic Info)
```json
{
  "id": "0da3a2dda93f463590ebcc4b0b4a477d",
  "igolf_id": "4OigiVW5wM4Y",
  "provider_id": "",
  "address": "285 Fairway Drive",
  "city": "Aliceville",
  "country": "USA",
  "classification": "",
  "email": "",
  "phone_number": "",
  "name": "Aliceville Country Club",
  "booking_url": "",
  "booking_window": "",
  "provider": "",
  "state": "AL",
  "gps": {
    "lat": 33.14376249164021,
    "lon": -88.16286683680502
  }
}
```

**Key advantage**: Already has GPS coordinates! No geocoding needed.

### Source 2: LLM Structured Data (Rich Details)
```json
{
  "id": "082fe8793777462cb827c6bdc85cff3d",
  "data": {
    "data": {
      "name": "Cabramatta Golf Club",
      "address": {...},
      "golf": {...},
      "hospitality": {...},
      // ... all the rich nested data
    }
  }
}
```

**Key advantage**: Comprehensive course details, amenities, policies, etc.

### Merge Strategy

1. **Use iGolf data as base** (has GPS coordinates)
2. **Enrich with LLM data** (match by name/location)
3. **Only geocode if GPS missing** (fallback for courses not in iGolf DB)

---

## Data Transformation Pipeline (Python)

### 1. Input Data Structures

#### iGolf Database Format:
```json
{
  "id": "082fe8793777462cb827c6bdc85cff3d",
  "exists": true,
  "data": {
    "data": {
      "name": "Cabramatta Golf Club",
      "address": {
        "city": "Cabramatta",
        "state": "NSW",
        "country": "Australia",
        "street": "Corner Cabramatta Road West & Cumberland Hwy",
        "postal_code": "2166"
      },
      "golf": {
        "courses": [...]
      },
      // ... all other nested data
    },
    "source": "llm_structured_v2",
    "updated_at": "2025-09-24T02:51:51.695000+00:00",
    "course_name": "Cabramatta Golf Club",
    "course_id": "082fe8793777462cb827c6bdc85cff3d"
  }
}
```

### 2. Python Data Transformation Script

```python
import psycopg2
from psycopg2.extras import Json, execute_values
import googlemaps
from typing import Dict, List, Optional, Tuple
import json
from datetime import datetime
import re

class GolfCourseETL:
    def __init__(self, db_config: Dict, google_api_key: str = None):
        """
        Initialize ETL pipeline
        
        Args:
            db_config: PostgreSQL connection config
            google_api_key: Google Maps API key for geocoding (optional if GPS already available)
        """
        self.conn = psycopg2.connect(**db_config)
        self.gmaps = googlemaps.Client(key=google_api_key) if google_api_key else None
        
    def geocode_address(self, course_data: Dict, gps_data: Dict = None) -> Tuple[Optional[float], Optional[float], Optional[str], float]:
        """
        Get coordinates - prefer existing GPS, fallback to geocoding
        
        Args:
            course_data: Course data with address
            gps_data: Optional GPS data from iGolf DB (e.g., {"lat": 33.14, "lon": -88.16})
        
        Returns:
            (latitude, longitude, google_place_id, confidence)
        """
        # If GPS coordinates already provided, use them (no geocoding needed!)
        if gps_data and gps_data.get('lat') and gps_data.get('lon'):
            return (
                gps_data['lat'],
                gps_data['lon'],
                None,  # No Google Place ID
                1.0    # High confidence - direct GPS
            )
        
        # Otherwise, geocode the address
        if not self.gmaps:
            print("Warning: No GPS data and no Google API key provided")
            return None, None, None, 0.0
        
        address = course_data.get('address', {})
        
        # Build full address string
        address_parts = [
            address.get('street', ''),
            address.get('city', ''),
            address.get('state', ''),
            address.get('postal_code', ''),
            address.get('country', '')
        ]
        full_address = ', '.join([p for p in address_parts if p])
        
        if not full_address:
            return None, None, None, 0.0
        
        # Check cache first
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT latitude, longitude, google_place_id, confidence
            FROM geocode_cache
            WHERE address_query = %s AND source = 'google'
        """, (full_address,))
        
        cached = cursor.fetchone()
        if cached:
            return cached
        
        # Call Google Maps Geocoding API
        try:
            result = self.gmaps.geocode(full_address)
            
            if not result:
                # Try with just city, state, country
                simplified = f"{address.get('city', '')}, {address.get('state', '')}, {address.get('country', '')}"
                result = self.gmaps.geocode(simplified)
            
            if result:
                location = result[0]['geometry']['location']
                lat = location['lat']
                lon = location['lng']
                place_id = result[0].get('place_id')
                
                # Determine confidence based on location_type
                location_type = result[0]['geometry'].get('location_type', '')
                confidence = {
                    'ROOFTOP': 1.0,
                    'RANGE_INTERPOLATED': 0.8,
                    'GEOMETRIC_CENTER': 0.6,
                    'APPROXIMATE': 0.4
                }.get(location_type, 0.5)
                
                # Cache the result
                cursor.execute("""
                    INSERT INTO geocode_cache 
                    (address_query, city, state, country, postal_code, 
                     latitude, longitude, formatted_address, google_place_id, 
                     confidence, source)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (address_query, source) DO NOTHING
                """, (
                    full_address,
                    address.get('city'),
                    address.get('state'),
                    address.get('country'),
                    address.get('postal_code'),
                    lat, lon,
                    result[0].get('formatted_address'),
                    place_id,
                    confidence,
                    'google'
                ))
                self.conn.commit()
                
                return lat, lon, place_id, confidence
            
        except Exception as e:
            print(f"Geocoding error for {full_address}: {e}")
        
        return None, None, None, 0.0
    
    def extract_amenities(self, course_data: Dict) -> List[str]:
        """
        Extract amenities from course data into flat array
        
        Returns:
            List of amenity strings (e.g., ['power_carts', 'driving_range'])
        """
        amenities = []
        
        # Get amenities from first course
        courses = course_data.get('golf', {}).get('courses', [])
        if courses and len(courses) > 0:
            course_amenities = courses[0].get('amenities', {})
            
            # Add all true amenities
            for key, value in course_amenities.items():
                if value is True:
                    amenities.append(key)
        
        # Add practice facilities
        practice = course_data.get('golf', {}).get('practice', {})
        if practice.get('range', {}).get('available'):
            amenities.append('driving_range')
        
        # Add services
        services = course_data.get('golf', {}).get('services', {})
        for key, value in services.items():
            if value == 'yes' or value is True:
                amenities.append(key)
        
        return list(set(amenities))  # Remove duplicates
    
    def generate_slug(self, course_name: str, city: str = '') -> str:
        """
        Generate URL-friendly slug from course name
        
        Returns:
            Slug string (e.g., 'cabramatta-golf-club')
        """
        # Combine name and city for uniqueness
        text = f"{course_name} {city}".lower()
        
        # Remove special characters and replace spaces with hyphens
        slug = re.sub(r'[^a-z0-9\s-]', '', text)
        slug = re.sub(r'\s+', '-', slug)
        slug = re.sub(r'-+', '-', slug)
        
        return slug.strip('-')
    
    def transform_course(self, raw_course: Dict, igolf_data: Dict = None) -> Dict:
        """
        Transform raw course JSON into database-ready format
        
        Args:
            raw_course: Raw course data from LLM structured source
            igolf_data: Optional iGolf database record with GPS coordinates
            
        Returns:
            Transformed course data ready for DB insert
        """
        data = raw_course['data']['data']
        course = data.get('golf', {}).get('courses', [{}])[0]
        address = data.get('address', {})
        
        # Get GPS coordinates (prefer iGolf data, fallback to geocoding)
        gps = igolf_data.get('gps') if igolf_data else None
        lat, lon, google_place_id, confidence = self.geocode_address(data, gps)
        
        # Extract verification status
        verification = data.get('verification', [])
        verified = len(verification) > 0
        verification_date = None
        if verified and verification:
            verified_at = verification[0].get('verified_at')
            if verified_at:
                verification_date = datetime.fromisoformat(verified_at.replace('Z', '+00:00'))
        
        # Extract pricing
        pricing = data.get('commerce', {}).get('pricing', {})
        walk_rate = pricing.get('walk_rate_range', {})
        
        # Extract badges
        badges = data.get('badges', {})
        
        # Generate slug
        slug = self.generate_slug(data.get('name', ''), address.get('city', ''))
        
        return {
            'id': raw_course['id'],
            'course_name': data.get('name'),
            'slug': slug,
            
            # IDs from iGolf data or external sources
            'igolf_id': igolf_data.get('igolf_id') if igolf_data else None,
            'provider': igolf_data.get('provider') if igolf_data else None,
            'provider_id': igolf_data.get('provider_id') if igolf_data else None,
            'google_place_id': google_place_id,
            
            # Status and type
            'status': data.get('status', 'open'),
            'type': data.get('programs', {}).get('memberships', {}).get('type', 'public'),
            
            # Location
            'latitude': lat,
            'longitude': lon,
            'city': address.get('city'),
            'state': address.get('state'),
            'country': address.get('country'),
            'postal_code': address.get('postal_code'),
            'street': address.get('street'),
            
            # Geocoding metadata
            'geocode_source': 'google' if lat else None,
            'geocode_confidence': confidence,
            'geocoded_at': datetime.now() if lat else None,
            
            # Course basics
            'holes': course.get('holes'),
            'par_total': course.get('par_total'),
            'yardage_total': course.get('yardage_total_yards'),
            'year_opened': course.get('year_opened'),
            'course_style': course.get('style'),
            
            # Pricing
            'walk_rate_min': walk_rate.get('min'),
            'walk_rate_max': walk_rate.get('max'),
            'cart_rate_min': None,  # Not in current schema
            'cart_rate_max': None,  # Not in current schema
            'currency': walk_rate.get('currency'),
            
            # Amenities
            'amenities': self.extract_amenities(data),
            
            # Badges
            'verified': verified,
            'verification_date': verification_date,
            'top_public': badges.get('top_public', False),
            'top_resort': badges.get('top_resort', False),
            'best_in_state': badges.get('best_in_state', False),
            'top_usa': badges.get('top_usa', False),
            'top_world': badges.get('top_world', False),
            
            # Contact
            'phone': data.get('contact', {}).get('phone'),
            'email': data.get('contact', {}).get('email'),
            'website': data.get('contact', {}).get('website'),
            
            # Social
            'instagram': data.get('social', {}).get('instagram'),
            'facebook': data.get('social', {}).get('facebook'),
            'twitter': data.get('social', {}).get('x'),
            'youtube': data.get('social', {}).get('youtube'),
            'tiktok': data.get('social', {}).get('tiktok'),
            
            # Full data
            'data': data,
            
            # Metadata
            'source': raw_course['data'].get('source'),
            'updated_at': raw_course['data'].get('updated_at')
        }
    
    def insert_course(self, course: Dict):
        """
        Insert or update course in database
        """
        cursor = self.conn.cursor()
        
        # Build PostGIS point if we have coordinates
        location_wkt = None
        if course['latitude'] and course['longitude']:
            location_wkt = f"POINT({course['longitude']} {course['latitude']})"
        
        cursor.execute("""
            INSERT INTO golf_courses (
                id, course_name, slug, igolf_id, provider, provider_id, google_place_id,
                status, type, location, city, state, country, postal_code, street,
                geocode_source, geocode_confidence, geocoded_at,
                holes, par_total, yardage_total, year_opened, course_style,
                walk_rate_min, walk_rate_max, cart_rate_min, cart_rate_max, currency,
                amenities, verified, verification_date,
                top_public, top_resort, best_in_state, top_usa, top_world,
                phone, email, website,
                instagram, facebook, twitter, youtube, tiktok,
                data, source, updated_at
            ) VALUES (
                %(id)s, %(course_name)s, %(slug)s, %(igolf_id)s, %(provider)s, %(provider_id)s, %(google_place_id)s,
                %(status)s, %(type)s, ST_GeogFromText(%(location)s), %(city)s, %(state)s, %(country)s, %(postal_code)s, %(street)s,
                %(geocode_source)s, %(geocode_confidence)s, %(geocoded_at)s,
                %(holes)s, %(par_total)s, %(yardage_total)s, %(year_opened)s, %(course_style)s,
                %(walk_rate_min)s, %(walk_rate_max)s, %(cart_rate_min)s, %(cart_rate_max)s, %(currency)s,
                %(amenities)s, %(verified)s, %(verification_date)s,
                %(top_public)s, %(top_resort)s, %(best_in_state)s, %(top_usa)s, %(top_world)s,
                %(phone)s, %(email)s, %(website)s,
                %(instagram)s, %(facebook)s, %(twitter)s, %(youtube)s, %(tiktok)s,
                %(data)s, %(source)s, %(updated_at)s
            )
            ON CONFLICT (id) DO UPDATE SET
                course_name = EXCLUDED.course_name,
                slug = EXCLUDED.slug,
                igolf_id = COALESCE(EXCLUDED.igolf_id, golf_courses.igolf_id),
                provider = COALESCE(EXCLUDED.provider, golf_courses.provider),
                provider_id = COALESCE(EXCLUDED.provider_id, golf_courses.provider_id),
                google_place_id = COALESCE(EXCLUDED.google_place_id, golf_courses.google_place_id),
                status = EXCLUDED.status,
                type = EXCLUDED.type,
                location = EXCLUDED.location,
                city = EXCLUDED.city,
                state = EXCLUDED.state,
                country = EXCLUDED.country,
                postal_code = EXCLUDED.postal_code,
                street = EXCLUDED.street,
                geocode_source = EXCLUDED.geocode_source,
                geocode_confidence = EXCLUDED.geocode_confidence,
                geocoded_at = EXCLUDED.geocoded_at,
                holes = EXCLUDED.holes,
                par_total = EXCLUDED.par_total,
                yardage_total = EXCLUDED.yardage_total,
                year_opened = EXCLUDED.year_opened,
                course_style = EXCLUDED.course_style,
                walk_rate_min = EXCLUDED.walk_rate_min,
                walk_rate_max = EXCLUDED.walk_rate_max,
                amenities = EXCLUDED.amenities,
                verified = EXCLUDED.verified,
                verification_date = EXCLUDED.verification_date,
                top_public = EXCLUDED.top_public,
                top_resort = EXCLUDED.top_resort,
                best_in_state = EXCLUDED.best_in_state,
                top_usa = EXCLUDED.top_usa,
                top_world = EXCLUDED.top_world,
                phone = EXCLUDED.phone,
                email = EXCLUDED.email,
                website = EXCLUDED.website,
                instagram = EXCLUDED.instagram,
                facebook = EXCLUDED.facebook,
                twitter = EXCLUDED.twitter,
                youtube = EXCLUDED.youtube,
                tiktok = EXCLUDED.tiktok,
                data = EXCLUDED.data,
                source = EXCLUDED.source,
                updated_at = EXCLUDED.updated_at
        """, {
            **course,
            'location': location_wkt
        })
        
        self.conn.commit()
    
    def process_courses(self, courses_json: List[Dict]):
        """
        Process and insert multiple courses
        
        Args:
            courses_json: List of raw course data
        """
        for i, raw_course in enumerate(courses_json):
            try:
                print(f"Processing {i+1}/{len(courses_json)}: {raw_course['data']['course_name']}")
                
                # Transform
                transformed = self.transform_course(raw_course)
                
                # Insert
                self.insert_course(transformed)
                
                print(f"  ✓ Inserted successfully")
                
            except Exception as e:
                print(f"  ✗ Error: {e}")
                continue
    
    def close(self):
        """Close database connection"""
        self.conn.close()


# Usage example
if __name__ == "__main__":
    # Configuration
    db_config = {
        'host': 'localhost',
        'database': 'golfai',
        'user': 'postgres',
        'password': 'your_password'
    }
    
    google_api_key = 'YOUR_GOOGLE_MAPS_API_KEY'
    
    # Load course data
    with open('courses.json', 'r') as f:
        courses = json.load(f)
    
    # Process
    etl = GolfCourseETL(db_config, google_api_key)
    etl.process_courses(courses)
    etl.close()
```

---

## Google Geocoding Flow

### When Do You Need Geocoding?

**You DON'T need geocoding if:**
- ✅ Course exists in iGolf database (already has GPS coordinates)
- ✅ You have lat/lon from another trusted source

**You DO need geocoding if:**
- ❌ Course is new and not in iGolf database
- ❌ GPS coordinates are missing or invalid
- ❌ You want Google Place ID for reviews/photos integration

### Why Google Maps Geocoding?

1. **Accuracy** - Best-in-class address resolution
2. **Place IDs** - Stable identifiers for locations (useful for Google reviews, photos)
3. **Confidence scores** - Know how accurate the geocoding is
4. **Global coverage** - Works worldwide

**Cost Consideration**: Google Geocoding API costs $5 per 1000 requests. With iGolf GPS data, you can skip most geocoding calls!

### Geocoding Process

```
1. Extract address from course data
   ↓
2. Check geocode_cache table
   ↓
3. If cached → use cached coordinates
   ↓
4. If not cached → call Google Maps Geocoding API
   ↓
5. Parse response:
   - latitude/longitude
   - google_place_id
   - confidence (based on location_type)
   ↓
6. Store in geocode_cache
   ↓
7. Return coordinates for PostGIS POINT
```

### API Call Example

```python
# Google Maps Geocoding API
result = gmaps.geocode("Corner Cabramatta Road West & Cumberland Hwy, Cabramatta, NSW 2166, Australia")

# Response structure
{
  "results": [{
    "geometry": {
      "location": {
        "lat": -33.8954,
        "lng": 150.9364
      },
      "location_type": "ROOFTOP"  # ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE
    },
    "place_id": "ChIJ...",
    "formatted_address": "..."
  }]
}
```

### Confidence Scoring

| Location Type | Confidence | Meaning |
|--------------|-----------|---------|
| ROOFTOP | 1.0 | Precise address |
| RANGE_INTERPOLATED | 0.8 | Interpolated between two points |
| GEOMETRIC_CENTER | 0.6 | Center of area (e.g., street) |
| APPROXIMATE | 0.4 | Approximate location |

---

## Additional IDs

### 1. iGolf ID (`igolf_id`)
- **Source**: iGolf database
- **Purpose**: Link to iGolf system, cross-reference
- **Format**: Alphanumeric (e.g., `4OigiVW5wM4Y`)
- **Populated**: From iGolf database during merge

### 2. Provider (`provider`)
- **Source**: Booking system integration
- **Purpose**: Identify which booking system the course uses
- **Format**: String (e.g., `'foretees'`, `'chronogolf'`, `'teesnap'`, `'golfnow'`)
- **Populated**: From iGolf database or manual mapping

### 3. Provider ID (`provider_id`)
- **Source**: Booking system integration
- **Purpose**: Provider-specific course identifier for booking links
- **Format**: String (varies by provider)
- **Populated**: From iGolf database or provider API integration

### 4. Google Place ID (`google_place_id`)
- **Source**: Google Maps Geocoding API (optional)
- **Purpose**: Link to Google Maps, reviews, photos
- **Format**: `ChIJ...` (variable length)
- **Populated**: During geocoding process (if needed)

---

## Recommended Workflow

### Step 1: Load iGolf Database
```python
# Load all courses from iGolf database
igolf_courses = load_igolf_courses()  # Your function to load iGolf data

# Create lookup by course name + location
igolf_lookup = {}
for course in igolf_courses:
    key = f"{course['name'].lower()}|{course['city'].lower()}|{course['state'].lower()}"
    igolf_lookup[key] = course
```

### Step 2: Process LLM Structured Data
```python
# Load LLM structured courses
llm_courses = load_llm_courses()  # Your function to load rich course data

for llm_course in llm_courses:
    data = llm_course['data']['data']
    
    # Try to find matching iGolf record
    key = f"{data['name'].lower()}|{data['address']['city'].lower()}|{data['address']['state'].lower()}"
    igolf_match = igolf_lookup.get(key)
    
    # Transform with iGolf data (includes GPS)
    transformed = etl.transform_course(llm_course, igolf_match)
    
    # Insert to database
    etl.insert_course(transformed)
```

### Step 3: Handle iGolf-Only Courses
```python
# Find courses in iGolf that don't have LLM data
for igolf_course in igolf_courses:
    if not has_llm_data(igolf_course):
        # Create minimal record from iGolf data
        minimal_course = {
            'id': igolf_course['id'],
            'course_name': igolf_course['name'],
            'igolf_id': igolf_course['igolf_id'],
            'provider': igolf_course['provider'],
            'provider_id': igolf_course['provider_id'],
            'latitude': igolf_course['gps']['lat'],
            'longitude': igolf_course['gps']['lon'],
            'city': igolf_course['city'],
            'state': igolf_course['state'],
            'country': igolf_course['country'],
            'geocode_source': 'igolf',
            'geocode_confidence': 1.0,
            'data': igolf_course  # Store original iGolf data
        }
        etl.insert_course(minimal_course)
```

### Result
- ✅ All courses have GPS coordinates (from iGolf or geocoding)
- ✅ Courses with LLM data have rich details
- ✅ Courses without LLM data still searchable by location
- ✅ Minimal geocoding API costs

---

## Query Examples

### Search courses by location (radius)

```python
cursor.execute("""
    SELECT 
        id,
        course_name,
        city,
        state,
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude,
        type,
        verified,
        amenities,
        ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
        ) / 1609.34 as distance_miles
    FROM golf_courses
    WHERE 
        status = 'open'
        AND ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
            %s * 1609.34  -- radius in miles to meters
        )
    ORDER BY distance_miles
    LIMIT 50
""", (lon, lat, lon, lat, radius_miles))
```

### Filter by amenities

```python
cursor.execute("""
    SELECT id, course_name, amenities
    FROM golf_courses
    WHERE amenities @> ARRAY['driving_range', 'power_carts']
    AND type = 'public'
""")
```

### Full-text search

```python
cursor.execute("""
    SELECT id, course_name, city, state
    FROM golf_courses
    WHERE search_vector @@ plainto_tsquery('english', %s)
    ORDER BY ts_rank(search_vector, plainto_tsquery('english', %s)) DESC
    LIMIT 20
""", (search_query, search_query))
```

---

## Performance Considerations

### Indexing Strategy

1. **Spatial index (GIST)** - For location-based queries
2. **GIN indexes** - For JSONB and array queries
3. **B-tree indexes** - For exact match queries (city, state, type)
4. **Partial indexes** - For filtered queries (verified courses only)

### Query Optimization

- **Limit JSONB queries** - Only load full `data` column when needed
- **Use indexed columns** - Filter on indexed fields first
- **Pagination** - Always use LIMIT/OFFSET for large result sets
- **Connection pooling** - Use psycopg2 connection pool for production

### Caching

- **Geocoding cache** - Avoid repeated API calls
- **Application cache** - Cache frequent queries (Redis/Memcached)
- **CDN** - Cache course images and static data

---

## Next Steps

1. **Set up PostgreSQL with PostGIS**
2. **Obtain Google Maps API key** (with Geocoding API enabled)
3. **Run schema creation script**
4. **Implement Python ETL pipeline**
5. **Process initial course data**
6. **Integrate with Next.js MCP tools**
7. **Add booking system ID mappings**
8. **Set up monitoring and logging**
