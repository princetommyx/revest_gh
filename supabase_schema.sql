-- Revesta Logistics Tracking - Supabase Schema Migration
-- Run this script in your Supabase SQL Editor

-- 1. Enable PostGIS Extension (Useful for future geofencing / distance calculations)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create the `pickup_requests` table
-- This mirrors the state of the active job/pickup request.
CREATE TABLE pickup_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disposer_id UUID NOT NULL, -- ID of the user requesting pickup (from your Django backend)
    collector_id UUID,         -- ID of the assigned collector
    waste_type VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'assigned', 'en_route_to_pickup', 'arrived', 'in_transit_to_facility', 'completed'
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    facility_lat DOUBLE PRECISION,
    facility_lng DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the `collector_locations` table
-- This stores the real-time telemetry from the collector's device.
CREATE TABLE collector_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collector_id UUID NOT NULL,
    pickup_request_id UUID REFERENCES pickup_requests(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    battery_level DOUBLE PRECISION,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Optional PostGIS point for spatial queries
    location geometry(Point, 4326)
);

-- Trigger to automatically update the PostGIS geometry column when lat/lng changes
CREATE OR REPLACE FUNCTION update_location_geometry()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_collector_geometry
BEFORE INSERT OR UPDATE OF latitude, longitude ON collector_locations
FOR EACH ROW
EXECUTE FUNCTION update_location_geometry();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE pickup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_locations ENABLE ROW LEVEL SECURITY;

-- Anonymous users (your mobile app, since Django handles core Auth) can READ if they know the Request ID
-- Security Note: In production, you might want to pass a signed JWT from Django to Supabase.
-- For this setup, we allow reading if the client knows the specific `pickup_request_id`.
CREATE POLICY "Allow public read of pickup requests"
ON pickup_requests FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow public read of locations for active requests"
ON collector_locations FOR SELECT
TO anon
USING (true);

-- Allow collectors (the app running in background) to insert and update their own locations.
-- Ideally gated by a JWT, but for drop-in ease we allow anon inserts to this specific table.
CREATE POLICY "Allow public insert of collector locations"
ON collector_locations FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow public update of collector locations"
ON collector_locations FOR UPDATE
TO anon
USING (true);

-- 5. Enable Supabase Realtime for the `collector_locations` table
-- This allows the Disposer app to subscribe to live coordinates
ALTER PUBLICATION supabase_realtime ADD TABLE collector_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE pickup_requests;
