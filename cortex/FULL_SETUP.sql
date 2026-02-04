-- ============================================================================
-- TERRA Geospatial Analytics - FULL SNOWFLAKE SETUP
-- ============================================================================
-- 
-- This is a CONSOLIDATED script that runs ALL setup steps in order.
-- Copy this entire file into Snowsight and run it.
--
-- After running this script, you'll need to:
-- 1. Upload the semantic model YAML to the stage (via UI or CLI)
-- 2. Create the TERRA_COPILOT agent in Snowsight UI (AI & ML → Cortex Agents)
--
-- ============================================================================

-- ============================================================================
-- PART 1: DATABASE AND WAREHOUSE SETUP
-- ============================================================================

CREATE DATABASE IF NOT EXISTS CONSTRUCTION_GEO_DB;
USE DATABASE CONSTRUCTION_GEO_DB;

CREATE WAREHOUSE IF NOT EXISTS CONSTRUCTION_WH 
  WAREHOUSE_SIZE = 'SMALL' 
  AUTO_SUSPEND = 60 
  AUTO_RESUME = TRUE;

USE WAREHOUSE CONSTRUCTION_WH;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS RAW;
CREATE SCHEMA IF NOT EXISTS CONSTRUCTION_GEO;
CREATE SCHEMA IF NOT EXISTS DOCS;

SELECT '✅ PART 1 COMPLETE: Database, warehouse, and schemas created' AS STATUS;

-- ============================================================================
-- PART 2: DATA TABLES (RAW SCHEMA)
-- ============================================================================

USE SCHEMA RAW;

-- Sites table
CREATE OR REPLACE TABLE SITES (
    SITE_ID VARCHAR(50) PRIMARY KEY,
    SITE_NAME VARCHAR(200),
    SITE_TYPE VARCHAR(100),
    LATITUDE FLOAT,
    LONGITUDE FLOAT,
    STATUS VARCHAR(50),
    START_DATE DATE,
    TARGET_END_DATE DATE,
    TOTAL_VOLUME_YD3 FLOAT
);

INSERT INTO SITES VALUES
('SITE-001', 'Highway 101 Expansion', 'highway', 37.7749, -122.4194, 'active', '2024-01-15', '2025-06-30', 2500000),
('SITE-002', 'Bayview Commercial Plaza', 'commercial', 37.7329, -122.3815, 'active', '2024-03-01', '2025-12-15', 850000),
('SITE-003', 'Marina District Residential', 'residential', 37.8044, -122.4350, 'active', '2024-02-01', '2025-09-01', 350000),
('SITE-004', 'Oakland Industrial Park', 'industrial', 37.8044, -122.2711, 'active', '2024-04-15', '2026-01-31', 1200000),
('SITE-005', 'San Jose Tech Campus', 'commercial', 37.3382, -121.8863, 'active', '2024-01-01', '2025-10-15', 750000),
('SITE-006', 'Fremont Solar Farm', 'infrastructure', 37.5485, -121.9886, 'paused', '2024-05-01', '2025-08-31', 450000);

-- Equipment table
CREATE OR REPLACE TABLE EQUIPMENT (
    EQUIPMENT_ID VARCHAR(50) PRIMARY KEY,
    EQUIPMENT_NAME VARCHAR(200),
    EQUIPMENT_TYPE VARCHAR(100),
    MAKE VARCHAR(100),
    MODEL VARCHAR(100),
    CAPACITY_TONS FLOAT,
    SITE_ID VARCHAR(50)
);

INSERT INTO EQUIPMENT VALUES
-- Site 001 Fleet
('EQ-001', 'Haul Truck Alpha-1', 'haul_truck', 'CAT', '785D', 150, 'SITE-001'),
('EQ-002', 'Haul Truck Alpha-2', 'haul_truck', 'CAT', '785D', 150, 'SITE-001'),
('EQ-003', 'Haul Truck Alpha-3', 'haul_truck', 'Komatsu', 'HD785-7', 145, 'SITE-001'),
('EQ-004', 'Haul Truck Alpha-4', 'haul_truck', 'Komatsu', 'HD785-7', 145, 'SITE-001'),
('EQ-005', 'Dozer D8-A', 'dozer', 'CAT', 'D8T', NULL, 'SITE-001'),
('EQ-006', 'Loader L-1', 'loader', 'CAT', '980M', 10, 'SITE-001'),
-- Site 002 Fleet
('EQ-007', 'Haul Truck Bravo-1', 'haul_truck', 'Volvo', 'A40G', 88, 'SITE-002'),
('EQ-008', 'Haul Truck Bravo-2', 'haul_truck', 'Volvo', 'A40G', 88, 'SITE-002'),
('EQ-009', 'Dozer D6-B', 'dozer', 'CAT', 'D6T', NULL, 'SITE-002'),
('EQ-010', 'Loader L-2', 'loader', 'John Deere', '844L', 8, 'SITE-002'),
-- Site 003 Fleet
('EQ-011', 'Haul Truck Charlie-1', 'haul_truck', 'CAT', '730', 60, 'SITE-003'),
('EQ-012', 'Haul Truck Charlie-2', 'haul_truck', 'CAT', '730', 60, 'SITE-003'),
('EQ-013', 'Dozer D5-C', 'dozer', 'CAT', 'D5', NULL, 'SITE-003'),
-- Site 004 Fleet
('EQ-014', 'Haul Truck Delta-1', 'haul_truck', 'CAT', '777G', 200, 'SITE-004'),
('EQ-015', 'Haul Truck Delta-2', 'haul_truck', 'CAT', '777G', 200, 'SITE-004'),
('EQ-016', 'Haul Truck Delta-3', 'haul_truck', 'Komatsu', 'HD605-8', 180, 'SITE-004'),
('EQ-017', 'Dozer D10-D', 'dozer', 'CAT', 'D10T', NULL, 'SITE-004'),
('EQ-018', 'Loader L-4', 'loader', 'CAT', '992K', 15, 'SITE-004'),
-- Site 005 Fleet
('EQ-019', 'Haul Truck Echo-1', 'haul_truck', 'Volvo', 'A45G', 95, 'SITE-005'),
('EQ-020', 'Haul Truck Echo-2', 'haul_truck', 'Volvo', 'A45G', 95, 'SITE-005');

-- GPS Breadcrumbs
CREATE OR REPLACE TABLE GPS_BREADCRUMBS (
    BREADCRUMB_ID VARCHAR(50) PRIMARY KEY,
    EQUIPMENT_ID VARCHAR(50),
    TIMESTAMP TIMESTAMP_NTZ,
    LATITUDE FLOAT,
    LONGITUDE FLOAT,
    SPEED_MPH FLOAT,
    HEADING_DEGREES FLOAT
);

-- Generate synthetic GPS data with Ghost Cycle patterns
INSERT INTO GPS_BREADCRUMBS
SELECT 
    'GPS-' || SEQ8() AS BREADCRUMB_ID,
    e.EQUIPMENT_ID,
    DATEADD('minute', -uniform(0, 1440, random()), CURRENT_TIMESTAMP()) AS TIMESTAMP,
    s.LATITUDE + uniform(-0.01, 0.01, random()) AS LATITUDE,
    s.LONGITUDE + uniform(-0.01, 0.01, random()) AS LONGITUDE,
    CASE 
        WHEN uniform(0, 100, random()) < 15 THEN uniform(8, 20, random())  -- 15% Ghost Cycles
        ELSE uniform(0, 25, random())
    END AS SPEED_MPH,
    uniform(0, 360, random()) AS HEADING_DEGREES
FROM EQUIPMENT e
JOIN SITES s ON e.SITE_ID = s.SITE_ID
WHERE e.EQUIPMENT_TYPE = 'haul_truck',
TABLE(GENERATOR(ROWCOUNT => 500));

-- Equipment Telematics
CREATE OR REPLACE TABLE EQUIPMENT_TELEMATICS (
    TELEMETRY_ID VARCHAR(50) PRIMARY KEY,
    EQUIPMENT_ID VARCHAR(50),
    TIMESTAMP TIMESTAMP_NTZ,
    ENGINE_LOAD_PERCENT FLOAT,
    FUEL_RATE_GPH FLOAT,
    PAYLOAD_TONS FLOAT
);

-- Generate telematics that correlates with GPS
INSERT INTO EQUIPMENT_TELEMATICS
SELECT 
    'TEL-' || ROW_NUMBER() OVER (ORDER BY g.TIMESTAMP) AS TELEMETRY_ID,
    g.EQUIPMENT_ID,
    g.TIMESTAMP,
    CASE 
        WHEN g.SPEED_MPH > 5 AND uniform(0, 100, random()) < 40 THEN uniform(15, 28, random())
        WHEN g.SPEED_MPH > 15 THEN uniform(60, 95, random())
        WHEN g.SPEED_MPH < 2 THEN uniform(10, 30, random())
        ELSE uniform(40, 80, random())
    END AS ENGINE_LOAD_PERCENT,
    CASE 
        WHEN g.SPEED_MPH > 15 THEN uniform(8, 15, random())
        WHEN g.SPEED_MPH > 5 THEN uniform(4, 8, random())
        ELSE uniform(1.5, 3, random())
    END AS FUEL_RATE_GPH,
    CASE 
        WHEN g.SPEED_MPH > 5 AND uniform(0, 100, random()) < 40 THEN 0
        ELSE uniform(0, e.CAPACITY_TONS, random())
    END AS PAYLOAD_TONS
FROM GPS_BREADCRUMBS g
JOIN EQUIPMENT e ON g.EQUIPMENT_ID = e.EQUIPMENT_ID
WHERE e.CAPACITY_TONS IS NOT NULL;

-- Cycle Events
CREATE OR REPLACE TABLE CYCLE_EVENTS (
    CYCLE_ID VARCHAR(50) PRIMARY KEY,
    EQUIPMENT_ID VARCHAR(50),
    SITE_ID VARCHAR(50),
    CYCLE_START TIMESTAMP_NTZ,
    CYCLE_END TIMESTAMP_NTZ,
    LOAD_VOLUME_YD3 FLOAT,
    CYCLE_TIME_MINUTES FLOAT,
    FUEL_CONSUMED_GAL FLOAT,
    IS_GHOST_CYCLE BOOLEAN
);

INSERT INTO CYCLE_EVENTS
SELECT 
    'CYC-' || SEQ8() AS CYCLE_ID,
    e.EQUIPMENT_ID,
    e.SITE_ID,
    DATEADD('minute', -uniform(0, 10080, random()), CURRENT_TIMESTAMP()) AS CYCLE_START,
    NULL AS CYCLE_END,
    CASE WHEN uniform(0, 100, random()) < 12 THEN 0 ELSE uniform(15, 35, random()) END AS LOAD_VOLUME_YD3,
    uniform(12, 25, random()) AS CYCLE_TIME_MINUTES,
    uniform(3, 8, random()) AS FUEL_CONSUMED_GAL,
    CASE WHEN uniform(0, 100, random()) < 12 THEN TRUE ELSE FALSE END AS IS_GHOST_CYCLE
FROM EQUIPMENT e
WHERE e.EQUIPMENT_TYPE = 'haul_truck',
TABLE(GENERATOR(ROWCOUNT => 50));

UPDATE CYCLE_EVENTS 
SET CYCLE_END = DATEADD('minute', CYCLE_TIME_MINUTES, CYCLE_START);

-- Volume Surveys
CREATE OR REPLACE TABLE VOLUME_SURVEYS (
    SURVEY_ID VARCHAR(50) PRIMARY KEY,
    SITE_ID VARCHAR(50),
    ZONE_NAME VARCHAR(200),
    SURVEY_DATE DATE,
    CUT_VOLUME_YD3 FLOAT,
    FILL_VOLUME_YD3 FLOAT,
    CUT_PLAN_YD3 FLOAT,
    FILL_PLAN_YD3 FLOAT
);

INSERT INTO VOLUME_SURVEYS VALUES
('SRV-001', 'SITE-001', 'North Section A', '2024-12-01', 125000, 98000, 130000, 100000),
('SRV-002', 'SITE-001', 'North Section B', '2024-12-01', 89000, 112000, 95000, 120000),
('SRV-003', 'SITE-001', 'Central Cut', '2024-12-01', 245000, 0, 300000, 0),
('SRV-004', 'SITE-001', 'South Fill', '2024-12-01', 0, 320000, 0, 350000),
('SRV-005', 'SITE-002', 'Parking Structure', '2024-12-01', 45000, 12000, 50000, 15000),
('SRV-006', 'SITE-002', 'Foundation Area', '2024-12-01', 28000, 35000, 30000, 40000),
('SRV-007', 'SITE-003', 'Building Pad A', '2024-12-01', 18000, 22000, 20000, 25000),
('SRV-008', 'SITE-003', 'Building Pad B', '2024-12-01', 15000, 19000, 16000, 20000),
('SRV-009', 'SITE-004', 'Warehouse Foundation', '2024-12-01', 85000, 45000, 90000, 50000),
('SRV-010', 'SITE-004', 'Loading Dock Area', '2024-12-01', 35000, 52000, 40000, 55000);

-- Views
CREATE OR REPLACE VIEW GHOST_CYCLE_ANALYSIS AS
SELECT 
    g.EQUIPMENT_ID,
    e.EQUIPMENT_NAME,
    e.SITE_ID,
    s.SITE_NAME,
    DATE_TRUNC('hour', g.TIMESTAMP) AS HOUR,
    COUNT(*) AS TOTAL_READINGS,
    SUM(CASE WHEN g.SPEED_MPH > 2 AND t.ENGINE_LOAD_PERCENT < 30 THEN 1 ELSE 0 END) AS GHOST_READINGS,
    ROUND(100.0 * SUM(CASE WHEN g.SPEED_MPH > 2 AND t.ENGINE_LOAD_PERCENT < 30 THEN 1 ELSE 0 END) / COUNT(*), 1) AS GHOST_CYCLE_PCT,
    ROUND(AVG(t.FUEL_RATE_GPH), 2) AS AVG_FUEL_RATE,
    ROUND(SUM(CASE WHEN g.SPEED_MPH > 2 AND t.ENGINE_LOAD_PERCENT < 30 THEN t.FUEL_RATE_GPH / 60 ELSE 0 END), 2) AS ESTIMATED_WASTED_FUEL_GAL
FROM GPS_BREADCRUMBS g
JOIN EQUIPMENT_TELEMATICS t ON g.EQUIPMENT_ID = t.EQUIPMENT_ID AND g.TIMESTAMP = t.TIMESTAMP
JOIN EQUIPMENT e ON g.EQUIPMENT_ID = e.EQUIPMENT_ID
JOIN SITES s ON e.SITE_ID = s.SITE_ID
GROUP BY 1, 2, 3, 4, 5;

CREATE OR REPLACE VIEW SITE_SUMMARY AS
SELECT 
    s.SITE_ID,
    s.SITE_NAME,
    s.SITE_TYPE,
    s.STATUS,
    COUNT(DISTINCT e.EQUIPMENT_ID) AS EQUIPMENT_COUNT,
    SUM(v.CUT_VOLUME_YD3) AS TOTAL_CUT_YD3,
    SUM(v.FILL_VOLUME_YD3) AS TOTAL_FILL_YD3,
    SUM(v.CUT_PLAN_YD3) AS PLANNED_CUT_YD3,
    SUM(v.FILL_PLAN_YD3) AS PLANNED_FILL_YD3,
    ROUND(100.0 * SUM(v.CUT_VOLUME_YD3) / NULLIF(SUM(v.CUT_PLAN_YD3), 0), 1) AS CUT_PROGRESS_PCT,
    ROUND(100.0 * SUM(v.FILL_VOLUME_YD3) / NULLIF(SUM(v.FILL_PLAN_YD3), 0), 1) AS FILL_PROGRESS_PCT
FROM SITES s
LEFT JOIN EQUIPMENT e ON s.SITE_ID = e.SITE_ID
LEFT JOIN VOLUME_SURVEYS v ON s.SITE_ID = v.SITE_ID
GROUP BY 1, 2, 3, 4;

SELECT '✅ PART 2 COMPLETE: Data tables and synthetic data created' AS STATUS;

-- Verification
SELECT 
    (SELECT COUNT(*) FROM SITES) AS SITES,
    (SELECT COUNT(*) FROM EQUIPMENT) AS EQUIPMENT,
    (SELECT COUNT(*) FROM GPS_BREADCRUMBS) AS GPS_POINTS,
    (SELECT COUNT(*) FROM EQUIPMENT_TELEMATICS) AS TELEMETRY_RECORDS,
    (SELECT COUNT(*) FROM CYCLE_EVENTS) AS CYCLES,
    (SELECT COUNT(*) FROM VOLUME_SURVEYS) AS SURVEYS;

-- ============================================================================
-- PART 3: DOCUMENTATION & CORTEX SEARCH
-- ============================================================================

USE SCHEMA DOCS;

CREATE OR REPLACE TABLE EQUIPMENT_DOCS (
    DOC_ID VARCHAR(50) PRIMARY KEY,
    EQUIPMENT_TYPE VARCHAR(100),
    DOCUMENT_TITLE VARCHAR(500),
    SECTION_TITLE VARCHAR(500),
    CONTENT TEXT,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

INSERT INTO EQUIPMENT_DOCS (DOC_ID, EQUIPMENT_TYPE, DOCUMENT_TITLE, SECTION_TITLE, CONTENT) VALUES
-- Ghost Cycle Documentation
('DOC-001', 'haul_truck', 'Ghost Cycle Detection Protocol', 'Definition and Indicators',
'Ghost Cycles occur when haul trucks travel routes without productive hauling. This is a major source of wasted fuel, time, and money on construction sites. 

KEY INDICATORS:
- Engine load below 30% while vehicle speed exceeds 2 mph
- Extended periods of travel without load weight changes
- GPS tracks showing circular routes without loading/dumping stops

IMPACT: A typical Ghost Cycle wastes 3-5 gallons of fuel per occurrence. For a fleet of 20 trucks, Ghost Cycles can waste over $50,000/month in fuel alone.'),

('DOC-002', 'haul_truck', 'Ghost Cycle Detection Protocol', 'Root Cause Analysis',
'ROOT CAUSES OF GHOST CYCLES:
1. Inefficient loading queue management - trucks waiting for loaders
2. Suboptimal haul road layouts - trucks taking longer routes
3. Poor material staging - loaders not positioned near material
4. Shift change coordination - trucks dispatched before loaders ready
5. Weather delays - rain causing temporary shutdowns
6. Equipment breakdowns - waiting for repairs

DETECTION METHOD: Combine GPS breadcrumb data with telematics. Flag any 5-minute window where speed > 2mph AND engine_load < 30% AND no load/dump event recorded.'),

('DOC-003', 'haul_truck', 'Ghost Cycle Detection Protocol', 'Mitigation Strategies',
'MITIGATION STRATEGIES:
1. Real-time dispatch optimization - route trucks to available loaders
2. Queue management system - limit trucks waiting at loading zones
3. Haul road network analysis - optimize road layouts quarterly
4. Predictive maintenance - reduce breakdown-related delays
5. Weather contingency plans - pre-position equipment
6. Shift handoff protocols - coordinate equipment availability

ROI: Sites implementing these strategies report 15-25% reduction in fuel costs and 10-15% improvement in cycle efficiency.'),

-- Fuel Efficiency Documentation
('DOC-004', 'haul_truck', 'Fuel Efficiency Best Practices', 'Optimal Operating Parameters',
'OPTIMAL FUEL EFFICIENCY FOR HAUL TRUCKS:

Engine Load: Target 70-85% during loaded hauls
- Below 50%: Underpowered or light loads - investigate
- Above 90%: Overloaded or uphill strain - reduce load or optimize grade

Speed: 15-25 mph is optimal for most haul roads
- Higher speeds increase fuel consumption exponentially
- Lower speeds waste time without fuel savings

Tire Pressure: Check daily - low pressure increases rolling resistance by 3-5%

Idle Time: Maximum 5 minutes - shut down engine if longer wait expected'),

('DOC-005', 'haul_truck', 'Fuel Efficiency Best Practices', 'Benchmarks and Targets',
'FUEL EFFICIENCY BENCHMARKS:

Loaded Haul: 0.8-1.2 gallons per cycle (varies by distance)
Empty Return: 0.4-0.6 gallons per cycle
Idle Consumption: 1.5-2.0 gallons per hour

KEY METRICS:
- Gallons per cubic yard moved
- Gallons per ton-mile
- Idle percentage (target < 15%)

TOP PERFORMERS: Achieve < 0.05 gallons per cubic yard in optimal conditions'),

-- Dozer Documentation
('DOC-006', 'dozer', 'Dozer Productivity Guidelines', 'Productivity Measurement',
'DOZER PRODUCTIVITY MEASUREMENT:

Primary Metric: Cubic yards per hour (CY/hr)
- D6 class: 150-250 CY/hr
- D8 class: 300-450 CY/hr
- D10 class: 500-700 CY/hr

FACTORS AFFECTING OUTPUT:
1. Blade size and type
2. Push distance (optimal < 200 ft)
3. Material type (sand vs rock)
4. Grade (downhill = +20%, uphill = -30%)
5. Operator skill level'),

('DOC-007', 'dozer', 'Dozer Productivity Guidelines', 'Efficiency Techniques',
'EFFICIENCY TECHNIQUES:

Slot Dozing: Create slots/trenches to contain material
- Increases efficiency by 15-20%
- Best for: fine-grained materials, long pushes

Tandem Dozing: Two dozers side by side
- Increases efficiency by 25-30%
- Best for: large volumes, consistent grades

Downhill Dozing: Push material downhill when possible
- Increases efficiency by 20-40%
- Plan cut/fill sequences to maximize downhill work

Avoid: Excessive ripping - switch to dedicated ripper for hard materials'),

-- Loader Documentation
('DOC-008', 'loader', 'Loader Efficiency Guidelines', 'Loading Best Practices',
'WHEEL LOADER BEST PRACTICES:

Bucket Fill Factor: Target 85-95% of rated capacity
- Underfilling: Wasted cycles, reduced productivity
- Overfilling: Spillage, increased wear, safety risk

Positioning: 
- Attack angle: 15-20 degrees to pile
- V-pattern loading for optimal bucket fill
- Minimize travel distance to truck

Truck Loading:
- 4-5 passes per truck is optimal
- Alternate sides to balance truck load
- Avoid waiting - signal trucks to position'),

-- Cycle Time Documentation
('DOC-009', 'haul_truck', 'Cycle Time Optimization', 'Component Analysis',
'CYCLE TIME COMPONENTS:

1. Queue Time: Waiting for loader (target < 2 min)
2. Load Time: Time to fill truck (target 2-3 min)
3. Haul Time: Loaded travel (varies by distance)
4. Dump Time: Unloading (target 1-2 min)
5. Return Time: Empty travel (should be < haul time)
6. Spot Time: Positioning for next load (target < 1 min)

OPTIMIZATION PRIORITY:
Focus on queue time first - its the most controllable and often the biggest waste. Next, optimize haul roads to reduce travel time.'),

('DOC-010', 'haul_truck', 'Cycle Time Optimization', 'Fleet Matching',
'FLEET MATCHING - TRUCKS TO LOADERS:

Rule of Thumb: Match ratio = (Cycle Time) / (Load Time)

Example:
- 15-minute cycle, 3-minute load = 5 trucks per loader
- 20-minute cycle, 4-minute load = 5 trucks per loader

SIGNS OF MISMATCH:
- Too few trucks: Loader idle time > 10%
- Too many trucks: Queue time > 3 minutes average

ADJUSTMENT: Add/remove trucks based on real-time queue monitoring. Target zero loader idle and < 2 minute average queue.');

-- Create Cortex Search Service
CREATE OR REPLACE CORTEX SEARCH SERVICE CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS_SEARCH
ON CONTENT
ATTRIBUTES EQUIPMENT_TYPE, DOCUMENT_TITLE, SECTION_TITLE
WAREHOUSE = CONSTRUCTION_WH
TARGET_LAG = '1 hour'
AS (
    SELECT 
        DOC_ID,
        EQUIPMENT_TYPE,
        DOCUMENT_TITLE,
        SECTION_TITLE,
        CONTENT
    FROM CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS
);

SELECT '✅ PART 3 COMPLETE: Documentation and Cortex Search service created' AS STATUS;

-- ============================================================================
-- PART 4: AGENT PREREQUISITES
-- ============================================================================

USE SCHEMA CONSTRUCTION_GEO;

-- Create stage for semantic model
CREATE OR REPLACE STAGE SEMANTIC_MODELS
  DIRECTORY = (ENABLE = TRUE)
  COMMENT = 'Stage for Cortex Analyst semantic model YAML files';

-- Create app role
CREATE ROLE IF NOT EXISTS TERRA_APP_ROLE;

-- Grant permissions
GRANT USAGE ON DATABASE CONSTRUCTION_GEO_DB TO ROLE TERRA_APP_ROLE;
GRANT USAGE ON ALL SCHEMAS IN DATABASE CONSTRUCTION_GEO_DB TO ROLE TERRA_APP_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA RAW TO ROLE TERRA_APP_ROLE;
GRANT SELECT ON ALL VIEWS IN SCHEMA RAW TO ROLE TERRA_APP_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA DOCS TO ROLE TERRA_APP_ROLE;
GRANT READ ON STAGE SEMANTIC_MODELS TO ROLE TERRA_APP_ROLE;
GRANT USAGE ON WAREHOUSE CONSTRUCTION_WH TO ROLE TERRA_APP_ROLE;
GRANT USAGE ON CORTEX SEARCH SERVICE CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS_SEARCH TO ROLE TERRA_APP_ROLE;

-- Create external access integration for map tiles
CREATE OR REPLACE NETWORK RULE TERRA_MAP_NETWORK_RULE
  MODE = EGRESS
  TYPE = HOST_PORT
  VALUE_LIST = (
    'a.tile.openstreetmap.org:443',
    'b.tile.openstreetmap.org:443',
    'c.tile.openstreetmap.org:443',
    'tile.openstreetmap.org:443',
    'a.basemaps.cartocdn.com:443',
    'b.basemaps.cartocdn.com:443',
    'c.basemaps.cartocdn.com:443',
    'd.basemaps.cartocdn.com:443'
  );

CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION TERRA_MAP_TILES_ACCESS
  ALLOWED_NETWORK_RULES = (TERRA_MAP_NETWORK_RULE)
  ENABLED = TRUE
  COMMENT = 'Allow SPCS to fetch map tiles for equipment tracking';

SELECT '✅ PART 4 COMPLETE: Stage, role, and external access created' AS STATUS;

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================

SELECT '=' AS SEP UNION ALL
SELECT '========== SETUP VERIFICATION ==========' UNION ALL
SELECT '=' AS SEP;

-- Check tables
SELECT 'RAW.SITES: ' || COUNT(*) || ' rows' AS CHECK_RESULT FROM RAW.SITES
UNION ALL
SELECT 'RAW.EQUIPMENT: ' || COUNT(*) || ' rows' FROM RAW.EQUIPMENT
UNION ALL
SELECT 'RAW.GPS_BREADCRUMBS: ' || COUNT(*) || ' rows' FROM RAW.GPS_BREADCRUMBS
UNION ALL
SELECT 'DOCS.EQUIPMENT_DOCS: ' || COUNT(*) || ' rows' FROM DOCS.EQUIPMENT_DOCS;

-- Check search service
SHOW CORTEX SEARCH SERVICES IN DATABASE CONSTRUCTION_GEO_DB;

-- Show what's in the stage (should be empty until you upload)
LIST @CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS;

-- Ghost Cycle summary
SELECT 
    COUNT(*) AS TOTAL_CYCLES,
    SUM(CASE WHEN IS_GHOST_CYCLE THEN 1 ELSE 0 END) AS GHOST_CYCLES,
    ROUND(100.0 * SUM(CASE WHEN IS_GHOST_CYCLE THEN 1 ELSE 0 END) / COUNT(*), 1) AS GHOST_CYCLE_PCT
FROM RAW.CYCLE_EVENTS;

-- ============================================================================
-- NEXT STEPS (MANUAL)
-- ============================================================================

SELECT '=' AS NEXT;
SELECT '========== NEXT STEPS (MANUAL) ==========' AS NEXT_STEPS;
SELECT '1. Upload construction_semantic_model.yaml to @SEMANTIC_MODELS stage' AS STEP_1;
SELECT '2. Create TERRA_COPILOT agent in Snowsight UI (AI & ML → Cortex Agents)' AS STEP_2;
SELECT '3. Run: GRANT USAGE ON CORTEX AGENT CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.TERRA_COPILOT TO ROLE TERRA_APP_ROLE;' AS STEP_3;
SELECT '4. Deploy SPCS service: cd copilot/deploy && ./deploy.sh all' AS STEP_4;
