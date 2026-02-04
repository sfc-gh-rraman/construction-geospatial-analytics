-- =====================================================
-- TERRA Geospatial Analytics - Data Tables & Synthetic Data
-- =====================================================
-- 
-- Creates RAW schema tables and populates with synthetic data
-- for demonstrating Ghost Cycle detection and geospatial analytics.
-- =====================================================

USE DATABASE CONSTRUCTION_GEO_DB;
USE SCHEMA RAW;
USE WAREHOUSE CONSTRUCTION_WH;

-- =====================================================
-- SITES TABLE
-- =====================================================

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

-- =====================================================
-- EQUIPMENT TABLE
-- =====================================================

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

-- =====================================================
-- GPS BREADCRUMBS (Sample - last 24 hours)
-- =====================================================

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
        -- Ghost Cycle pattern: high speed, will have low engine load
        WHEN uniform(0, 100, random()) < 15 THEN uniform(8, 20, random())  -- 15% Ghost Cycles
        ELSE uniform(0, 25, random())
    END AS SPEED_MPH,
    uniform(0, 360, random()) AS HEADING_DEGREES
FROM EQUIPMENT e
JOIN SITES s ON e.SITE_ID = s.SITE_ID
WHERE e.EQUIPMENT_TYPE = 'haul_truck',
TABLE(GENERATOR(ROWCOUNT => 500));

-- =====================================================
-- EQUIPMENT TELEMATICS (Sample - matches GPS timestamps)
-- =====================================================

CREATE OR REPLACE TABLE EQUIPMENT_TELEMATICS (
    TELEMETRY_ID VARCHAR(50) PRIMARY KEY,
    EQUIPMENT_ID VARCHAR(50),
    TIMESTAMP TIMESTAMP_NTZ,
    ENGINE_LOAD_PERCENT FLOAT,
    FUEL_RATE_GPH FLOAT,
    PAYLOAD_TONS FLOAT
);

-- Generate telematics that correlates with GPS (Ghost Cycles = low load + high speed)
INSERT INTO EQUIPMENT_TELEMATICS
SELECT 
    'TEL-' || ROW_NUMBER() OVER (ORDER BY g.TIMESTAMP) AS TELEMETRY_ID,
    g.EQUIPMENT_ID,
    g.TIMESTAMP,
    CASE 
        -- Ghost Cycle: high speed (>5mph) with low load = empty haul
        WHEN g.SPEED_MPH > 5 AND uniform(0, 100, random()) < 40 THEN uniform(15, 28, random())
        WHEN g.SPEED_MPH > 15 THEN uniform(60, 95, random())  -- Normal loaded haul
        WHEN g.SPEED_MPH < 2 THEN uniform(10, 30, random())   -- Idle
        ELSE uniform(40, 80, random())  -- Normal operation
    END AS ENGINE_LOAD_PERCENT,
    CASE 
        WHEN g.SPEED_MPH > 15 THEN uniform(8, 15, random())
        WHEN g.SPEED_MPH > 5 THEN uniform(4, 8, random())
        ELSE uniform(1.5, 3, random())
    END AS FUEL_RATE_GPH,
    CASE 
        -- Correlate payload with engine load
        WHEN g.SPEED_MPH > 5 AND uniform(0, 100, random()) < 40 THEN 0  -- Ghost Cycle = empty
        ELSE uniform(0, e.CAPACITY_TONS, random())
    END AS PAYLOAD_TONS
FROM GPS_BREADCRUMBS g
JOIN EQUIPMENT e ON g.EQUIPMENT_ID = e.EQUIPMENT_ID
WHERE e.CAPACITY_TONS IS NOT NULL;

-- =====================================================
-- CYCLE EVENTS (Load-Haul-Dump cycles)
-- =====================================================

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

-- Generate cycle events with ~12% Ghost Cycles
INSERT INTO CYCLE_EVENTS
SELECT 
    'CYC-' || SEQ8() AS CYCLE_ID,
    e.EQUIPMENT_ID,
    e.SITE_ID,
    DATEADD('minute', -uniform(0, 10080, random()), CURRENT_TIMESTAMP()) AS CYCLE_START,
    NULL AS CYCLE_END,  -- Will calculate
    CASE WHEN uniform(0, 100, random()) < 12 THEN 0 ELSE uniform(15, 35, random()) END AS LOAD_VOLUME_YD3,
    uniform(12, 25, random()) AS CYCLE_TIME_MINUTES,
    uniform(3, 8, random()) AS FUEL_CONSUMED_GAL,
    CASE WHEN uniform(0, 100, random()) < 12 THEN TRUE ELSE FALSE END AS IS_GHOST_CYCLE
FROM EQUIPMENT e
WHERE e.EQUIPMENT_TYPE = 'haul_truck',
TABLE(GENERATOR(ROWCOUNT => 50));

-- Update cycle_end based on start + duration
UPDATE CYCLE_EVENTS 
SET CYCLE_END = DATEADD('minute', CYCLE_TIME_MINUTES, CYCLE_START);

-- =====================================================
-- VOLUME SURVEYS (Cut/Fill tracking)
-- =====================================================

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
-- Site 001 zones
('SRV-001', 'SITE-001', 'North Section A', '2024-12-01', 125000, 98000, 130000, 100000),
('SRV-002', 'SITE-001', 'North Section B', '2024-12-01', 89000, 112000, 95000, 120000),
('SRV-003', 'SITE-001', 'Central Cut', '2024-12-01', 245000, 0, 300000, 0),
('SRV-004', 'SITE-001', 'South Fill', '2024-12-01', 0, 320000, 0, 350000),
-- Site 002 zones
('SRV-005', 'SITE-002', 'Parking Structure', '2024-12-01', 45000, 12000, 50000, 15000),
('SRV-006', 'SITE-002', 'Foundation Area', '2024-12-01', 28000, 35000, 30000, 40000),
-- Site 003 zones
('SRV-007', 'SITE-003', 'Building Pad A', '2024-12-01', 18000, 22000, 20000, 25000),
('SRV-008', 'SITE-003', 'Building Pad B', '2024-12-01', 15000, 19000, 16000, 20000),
-- Site 004 zones
('SRV-009', 'SITE-004', 'Warehouse Foundation', '2024-12-01', 85000, 45000, 90000, 50000),
('SRV-010', 'SITE-004', 'Loading Dock Area', '2024-12-01', 35000, 52000, 40000, 55000);

-- =====================================================
-- GHOST CYCLE ANALYSIS VIEW
-- =====================================================

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

-- =====================================================
-- SITE SUMMARY VIEW
-- =====================================================

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

-- =====================================================
-- Grants
-- =====================================================

GRANT SELECT ON ALL TABLES IN SCHEMA RAW TO ROLE TERRA_APP_ROLE;
GRANT SELECT ON ALL VIEWS IN SCHEMA RAW TO ROLE TERRA_APP_ROLE;

-- =====================================================
-- Verification
-- =====================================================

SELECT '✅ Data loaded successfully!' AS STATUS;

SELECT 
    (SELECT COUNT(*) FROM SITES) AS SITES,
    (SELECT COUNT(*) FROM EQUIPMENT) AS EQUIPMENT,
    (SELECT COUNT(*) FROM GPS_BREADCRUMBS) AS GPS_POINTS,
    (SELECT COUNT(*) FROM EQUIPMENT_TELEMATICS) AS TELEMETRY_RECORDS,
    (SELECT COUNT(*) FROM CYCLE_EVENTS) AS CYCLES,
    (SELECT COUNT(*) FROM VOLUME_SURVEYS) AS SURVEYS;

-- Ghost Cycle summary
SELECT 'Ghost Cycle Summary:' AS METRIC;
SELECT 
    COUNT(*) AS TOTAL_CYCLES,
    SUM(CASE WHEN IS_GHOST_CYCLE THEN 1 ELSE 0 END) AS GHOST_CYCLES,
    ROUND(100.0 * SUM(CASE WHEN IS_GHOST_CYCLE THEN 1 ELSE 0 END) / COUNT(*), 1) AS GHOST_CYCLE_PCT
FROM CYCLE_EVENTS;
