-- Supabase PostGIS Function for Geospatial Search
-- Run this in your Supabase SQL Editor to enable radius-based course searches

-- Create function to search courses within a radius
CREATE OR REPLACE FUNCTION search_courses_within_radius(
  search_lat DOUBLE PRECISION,
  search_lon DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
  id VARCHAR(255),
  course_name VARCHAR(500),
  city VARCHAR(255),
  state VARCHAR(100),
  country VARCHAR(100),
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gc.id,
    gc.course_name,
    gc.city,
    gc.state,
    gc.country,
    gc.lat,
    gc.lon,
    ST_Distance(
      gc.location,
      ST_SetSRID(ST_MakePoint(search_lon, search_lat), 4326)::geography
    ) as distance_meters
  FROM golf_courses gc
  WHERE gc.status = 'open'
    AND ST_DWithin(
      gc.location,
      ST_SetSRID(ST_MakePoint(search_lon, search_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_courses_within_radius TO authenticated;
GRANT EXECUTE ON FUNCTION search_courses_within_radius TO anon;

-- Example usage:
-- SELECT * FROM search_courses_within_radius(32.7157, -117.1611, 40233.6);
-- (Searches within 25 miles of San Diego)
