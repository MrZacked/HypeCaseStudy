-- Fix PostGIS schema path issue
-- Set search path to include extensions schema where PostGIS types live
SET search_path = "$user", public, extensions;

-- Verify PostGIS is working
SELECT postgis_version();

-- Create places table with proper schema path
CREATE TABLE IF NOT EXISTS places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  logo TEXT,
  longitude DECIMAL(10, 7) NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  sub_category TEXT NOT NULL,
  isTradeAreaAvailable BOOLEAN DEFAULT false,
  isHomeZipcodesAvailable BOOLEAN DEFAULT false,
  isMyPlace BOOLEAN DEFAULT false,
  location geography(POINT, 4326) GENERATED ALWAYS AS (ST_Point(longitude, latitude)) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trade_areas table
CREATE TABLE IF NOT EXISTS trade_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pid UUID REFERENCES places(id) ON DELETE CASCADE,
  polygon JSONB NOT NULL,
  trade_area INTEGER NOT NULL CHECK (trade_area IN (30, 50, 70)),
  geometry geography GENERATED ALWAYS AS (ST_GeomFromGeoJSON(polygon::TEXT)) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create zipcodes table
CREATE TABLE IF NOT EXISTS zipcodes (
  id TEXT PRIMARY KEY,
  polygon JSONB NOT NULL,
  geometry geography GENERATED ALWAYS AS (ST_GeomFromGeoJSON(polygon::TEXT)) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create home_zipcodes table
CREATE TABLE IF NOT EXISTS home_zipcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  locations JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial indexes for performance
CREATE INDEX IF NOT EXISTS idx_places_location ON places USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_trade_areas_geometry ON trade_areas USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_zipcodes_geometry ON zipcodes USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_places_sub_category ON places(sub_category);
CREATE INDEX IF NOT EXISTS idx_places_my_place ON places(isMyPlace) WHERE isMyPlace = true;

-- Function to get places within viewport bounds with optional filters
CREATE OR REPLACE FUNCTION get_places_in_viewport(
  min_lat DECIMAL,
  min_lng DECIMAL,
  max_lat DECIMAL,
  max_lng DECIMAL,
  radius_filter INTEGER DEFAULT NULL,
  category_filter TEXT[] DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  name TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  logo TEXT,
  longitude DECIMAL,
  latitude DECIMAL,
  sub_category TEXT,
  isTradeAreaAvailable BOOLEAN,
  isHomeZipcodesAvailable BOOLEAN,
  isMyPlace BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = "$user", public, extensions
AS $$
DECLARE
  my_place_location geography;
BEGIN
  -- Get my place location if radius filter is specified
  IF radius_filter IS NOT NULL THEN
    SELECT p.location INTO my_place_location
    FROM places p
    WHERE p.isMyPlace = true
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT 
    p.id, p.name, p.street_address, p.city, p.state, p.logo,
    p.longitude, p.latitude, p.sub_category,
    p.isTradeAreaAvailable, p.isHomeZipcodesAvailable, p.isMyPlace
  FROM places p
  WHERE 
    -- Viewport bounds check
    p.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    -- Radius filter (optional)
    AND (
      radius_filter IS NULL 
      OR my_place_location IS NULL 
      OR ST_DWithin(p.location, my_place_location, radius_filter)
    )
    -- Category filter (optional)
    AND (
      category_filter IS NULL 
      OR p.sub_category = ANY(category_filter)
    )
  ORDER BY p.name;
END;
$$;

-- Function to get nearby places from a specific location
CREATE OR REPLACE FUNCTION get_nearby_places(
  center_lat DECIMAL,
  center_lng DECIMAL,
  radius_meters INTEGER,
  category_filter TEXT[] DEFAULT NULL,
  exclude_place_id UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  name TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  longitude DECIMAL,
  latitude DECIMAL,
  sub_category TEXT,
  distance_meters DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = "$user", public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.name, p.street_address, p.city, p.state,
    p.longitude, p.latitude, p.sub_category,
    ST_Distance(p.location, ST_Point(center_lng, center_lat)::geography) as distance_meters
  FROM places p
  WHERE 
    -- Distance check
    ST_DWithin(
      p.location, 
      ST_Point(center_lng, center_lat)::geography, 
      radius_meters
    )
    -- Category filter (optional)
    AND (
      category_filter IS NULL 
      OR p.sub_category = ANY(category_filter)
    )
    -- Exclude specific place (optional)
    AND (
      exclude_place_id IS NULL 
      OR p.id != exclude_place_id
    )
  ORDER BY distance_meters;
END;
$$;

-- Function to get trade area data for a specific place
CREATE OR REPLACE FUNCTION get_trade_area_data(place_id UUID)
RETURNS TABLE (
  id UUID,
  pid UUID,
  polygon JSONB,
  trade_area INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = "$user", public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT ta.id, ta.pid, ta.polygon, ta.trade_area
  FROM trade_areas ta
  WHERE ta.pid = place_id
  ORDER BY ta.trade_area;
END;
$$;

-- Function to get home zipcode data for a specific place
CREATE OR REPLACE FUNCTION get_home_zipcode_data(input_place_id UUID)
RETURNS TABLE (
  place_id UUID,
  locations JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = "$user", public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT hz.place_id, hz.locations
  FROM home_zipcodes hz
  WHERE hz.place_id = input_place_id;
END;
$$;

-- Row Level Security policies
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE zipcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_zipcodes ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
DROP POLICY IF EXISTS "Enable read access for all users" ON places;
CREATE POLICY "Enable read access for all users" ON places FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON trade_areas;
CREATE POLICY "Enable read access for all users" ON trade_areas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON zipcodes;
CREATE POLICY "Enable read access for all users" ON zipcodes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON home_zipcodes;
CREATE POLICY "Enable read access for all users" ON home_zipcodes FOR SELECT USING (true);

-- Grant usage on schema for anonymous users
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Reset search path for future sessions
SET search_path = "$user", public, extensions;

SELECT 'PostGIS database setup completed successfully!' as status;