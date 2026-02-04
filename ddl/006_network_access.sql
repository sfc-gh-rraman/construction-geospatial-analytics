-- ============================================================================
-- TERRA Geospatial Analytics - Network Access for Map Tiles
-- ============================================================================
-- Required for Leaflet map tiles to load in SPCS

USE DATABASE CONSTRUCTION_GEO_DB;

-- Network rule for map tile providers
CREATE OR REPLACE NETWORK RULE TERRA_MAP_TILES_RULE
  TYPE = HOST_PORT
  MODE = EGRESS
  VALUE_LIST = (
    'tile.openstreetmap.org:443',
    'a.tile.openstreetmap.org:443',
    'b.tile.openstreetmap.org:443',
    'c.tile.openstreetmap.org:443',
    'a.basemaps.cartocdn.com:443',
    'b.basemaps.cartocdn.com:443',
    'c.basemaps.cartocdn.com:443',
    'd.basemaps.cartocdn.com:443'
  );

-- External access integration
CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION TERRA_MAP_TILES_ACCESS
  ALLOWED_NETWORK_RULES = (TERRA_MAP_TILES_RULE)
  ENABLED = TRUE;

-- Grant to roles
GRANT USAGE ON INTEGRATION TERRA_MAP_TILES_ACCESS TO ROLE ACCOUNTADMIN;
