-- =====================================================
-- TERRA Geospatial Analytics - Cortex Agent Deployment
-- =====================================================
-- 
-- This file provides the SQL setup for TERRA_COPILOT agent.
-- The actual agent is created via Snowsight UI or Python API.
--
-- RUN THIS FILE IN SNOWSIGHT TO PREPARE ALL PREREQUISITES
-- =====================================================

USE DATABASE CONSTRUCTION_GEO_DB;
USE WAREHOUSE CONSTRUCTION_WH;

-- =====================================================
-- Step 1: Create Schemas
-- =====================================================

CREATE SCHEMA IF NOT EXISTS CONSTRUCTION_GEO;
CREATE SCHEMA IF NOT EXISTS DOCS;
CREATE SCHEMA IF NOT EXISTS RAW;

USE SCHEMA CONSTRUCTION_GEO;

-- =====================================================
-- Step 2: Create Semantic Model Stage
-- =====================================================

CREATE OR REPLACE STAGE SEMANTIC_MODELS
  DIRECTORY = (ENABLE = TRUE)
  COMMENT = 'Stage for Cortex Analyst semantic model YAML files';

-- After running this, upload the semantic model:
-- Via SnowCLI:
--   snow stage copy cortex/construction_semantic_model.yaml @CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS
-- Via Snowsight:
--   Data → Databases → CONSTRUCTION_GEO_DB → CONSTRUCTION_GEO → Stages → SEMANTIC_MODELS → Upload

SELECT '📁 Stage created. Upload construction_semantic_model.yaml to this stage.' AS INSTRUCTION;

-- =====================================================
-- Step 3: Verify Semantic Model Upload
-- =====================================================

LIST @SEMANTIC_MODELS;

-- If empty, the semantic model hasn't been uploaded yet!

-- =====================================================
-- Step 4: Create App Role
-- =====================================================

CREATE ROLE IF NOT EXISTS TERRA_APP_ROLE;

-- Grant permissions
GRANT USAGE ON DATABASE CONSTRUCTION_GEO_DB TO ROLE TERRA_APP_ROLE;
GRANT USAGE ON ALL SCHEMAS IN DATABASE CONSTRUCTION_GEO_DB TO ROLE TERRA_APP_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA RAW TO ROLE TERRA_APP_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA DOCS TO ROLE TERRA_APP_ROLE;
GRANT READ ON STAGE SEMANTIC_MODELS TO ROLE TERRA_APP_ROLE;
GRANT USAGE ON WAREHOUSE CONSTRUCTION_WH TO ROLE TERRA_APP_ROLE;

SELECT '✅ TERRA_APP_ROLE created with permissions.' AS STATUS;

-- =====================================================
-- Step 5: Create External Access for Map Tiles
-- =====================================================

CREATE OR REPLACE NETWORK RULE TERRA_MAP_NETWORK_RULE
  MODE = EGRESS
  TYPE = HOST_PORT
  VALUE_LIST = (
    'a.tile.openstreetmap.org:443',
    'b.tile.openstreetmap.org:443',
    'c.tile.openstreetmap.org:443',
    'tile.openstreetmap.org:443'
  );

CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION TERRA_MAP_TILES_ACCESS
  ALLOWED_NETWORK_RULES = (TERRA_MAP_NETWORK_RULE)
  ENABLED = TRUE
  COMMENT = 'Allow SPCS to fetch OpenStreetMap tiles for equipment tracking map';

SELECT '✅ External access integration created for map tiles.' AS STATUS;

-- =====================================================
-- AGENT DEPLOYMENT (Do in Snowsight UI)
-- =====================================================

/*
Go to Snowsight → AI & ML → Cortex Agents → Create Agent

Agent Configuration:
--------------------
Name: TERRA_COPILOT
Database: CONSTRUCTION_GEO_DB
Schema: CONSTRUCTION_GEO
Model: mistral-large

Instructions:
-------------
You are TERRA, an AI assistant for construction geospatial analytics.
You help site managers, equipment operators, and fleet analysts understand:
- Equipment utilization and Ghost Cycle detection
- Haul road efficiency and optimal cycle times
- Cut/fill volume progress vs plan
- Fleet productivity and fuel efficiency

HIDDEN DISCOVERY FEATURE:
When asked about "Ghost Cycles" or "hidden patterns", analyze telematics data
for equipment with HIGH SPEED (>2 mph) but LOW ENGINE LOAD (<30%). This indicates
empty hauls that waste fuel and time. Always quantify the impact in:
- Wasted fuel gallons
- Lost productivity hours
- Dollar impact

Always provide actionable recommendations, not just data.

Tools to Add:
-------------
1. Cortex Analyst (Text-to-SQL)
   - Name: data_analyst
   - Semantic Model: @CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS/construction_semantic_model.yaml
   - Description: Query geospatial, equipment, and cycle data

2. Cortex Search (if docs exist)
   - Name: equipment_docs
   - Service: CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS_SEARCH
   - Description: Search equipment documentation and best practices
*/

-- =====================================================
-- Grant Agent Permissions (After Agent Creation)
-- =====================================================

-- Uncomment and run AFTER creating the agent in Snowsight:
-- GRANT USAGE ON CORTEX AGENT CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.TERRA_COPILOT TO ROLE TERRA_APP_ROLE;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if agent exists (run after creating in UI)
SHOW CORTEX AGENTS IN SCHEMA CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO;

-- Check search services
SHOW CORTEX SEARCH SERVICES IN DATABASE CONSTRUCTION_GEO_DB;

-- Test semantic model (if agent exists)
-- SELECT SNOWFLAKE.CORTEX.ANALYST(
--     '@CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS/construction_semantic_model.yaml',
--     'What is the average cycle time by equipment type?'
-- );

-- =====================================================
-- Summary Checklist
-- =====================================================

SELECT '======== SETUP CHECKLIST ========' AS CHECKLIST;
SELECT '1. [ ] Create database CONSTRUCTION_GEO_DB' AS STEP_1;
SELECT '2. [ ] Run this SQL file to create schemas, stage, role' AS STEP_2;
SELECT '3. [ ] Upload construction_semantic_model.yaml to stage' AS STEP_3;
SELECT '4. [ ] Create data tables in RAW schema (see deploy_data.sql)' AS STEP_4;
SELECT '5. [ ] Load synthetic data' AS STEP_5;
SELECT '6. [ ] Create Cortex Search service (see deploy_search.sql)' AS STEP_6;
SELECT '7. [ ] Create TERRA_COPILOT agent in Snowsight UI' AS STEP_7;
SELECT '8. [ ] Grant agent permissions (uncomment line above)' AS STEP_8;
SELECT '9. [ ] Deploy SPCS service (./deploy.sh all)' AS STEP_9;
