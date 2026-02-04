-- =====================================================
-- TERRA Geospatial Analytics - Cortex Search Deployment
-- =====================================================
-- 
-- Creates Cortex Search services for semantic document search.
-- This enables TERRA to search equipment documentation and best practices.
-- =====================================================

USE DATABASE CONSTRUCTION_GEO_DB;
USE SCHEMA DOCS;
USE WAREHOUSE CONSTRUCTION_WH;

-- =====================================================
-- Document Tables
-- =====================================================

-- Equipment documentation (manuals, best practices, protocols)
CREATE OR REPLACE TABLE EQUIPMENT_DOCS (
    DOC_ID VARCHAR(50) PRIMARY KEY,
    EQUIPMENT_TYPE VARCHAR(100),
    DOCUMENT_TITLE VARCHAR(500),
    SECTION_TITLE VARCHAR(500),
    CONTENT TEXT,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

COMMENT ON TABLE EQUIPMENT_DOCS IS 'Equipment documentation for Cortex Search - includes Ghost Cycle protocols and best practices';

-- =====================================================
-- Populate Equipment Documentation
-- =====================================================

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

-- =====================================================
-- Create Cortex Search Service
-- =====================================================

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

COMMENT ON CORTEX SEARCH SERVICE EQUIPMENT_DOCS_SEARCH IS 
'Semantic search on equipment documentation, Ghost Cycle protocols, and best practices';

-- =====================================================
-- Grants
-- =====================================================

GRANT SELECT ON ALL TABLES IN SCHEMA DOCS TO ROLE TERRA_APP_ROLE;
GRANT USAGE ON CORTEX SEARCH SERVICE EQUIPMENT_DOCS_SEARCH TO ROLE TERRA_APP_ROLE;

-- =====================================================
-- Verification
-- =====================================================

-- Show search services
SHOW CORTEX SEARCH SERVICES IN DATABASE CONSTRUCTION_GEO_DB;

-- Test search (uncomment to run)
-- SELECT * FROM TABLE(
--     CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS_SEARCH(
--         QUERY => 'What causes Ghost Cycles in haul trucks?',
--         LIMIT => 5
--     )
-- );

-- Test search for fuel efficiency
-- SELECT * FROM TABLE(
--     CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS_SEARCH(
--         QUERY => 'How can I improve fuel efficiency for my fleet?',
--         LIMIT => 5
--     )
-- );

SELECT '✅ Cortex Search service created with ' || (SELECT COUNT(*) FROM EQUIPMENT_DOCS) || ' documents.' AS STATUS;
