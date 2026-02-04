# TERRA Geospatial Analytics - Cortex Setup Guide

## 🚨 THE ROOT CAUSE OF YOUR PROBLEM

Your chat is using **pre-wired fallbacks** because the **Cortex Agent doesn't exist in Snowflake**.

The `cortex_agent_client.py` is correctly written - it tries to call:
```
POST /api/v2/databases/CONSTRUCTION_GEO_DB/schemas/CONSTRUCTION_GEO/agents/TERRA_COPILOT:run
```

But **TERRA_COPILOT doesn't exist**, so:
1. The API call returns 404 (agent not found)
2. The frontend falls back to `/api/chat` (the old orchestrator)
3. The orchestrator uses `direct_sql_query()` which is just keyword matching
4. You get pre-wired responses, not real AI

---

## 🎯 QUICK START - RUN THESE IN ORDER

```bash
# In Snowsight SQL Worksheet, run these files in order:
1. cortex/deploy_data.sql      # Creates tables + synthetic data
2. cortex/deploy_search.sql    # Creates Cortex Search service
3. cortex/deploy_agent.sql     # Creates stage + role (then create agent in UI)
```

Then create the agent via Snowsight UI (see Step 5 below).

---

## 📋 DETAILED SETUP (Run in Snowsight in order)

### Step 1: Create Database and Schema

```sql
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS CONSTRUCTION_GEO_DB;
USE DATABASE CONSTRUCTION_GEO_DB;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS RAW;
CREATE SCHEMA IF NOT EXISTS CONSTRUCTION_GEO;
CREATE SCHEMA IF NOT EXISTS DOCS;

-- Create warehouse if not exists
CREATE WAREHOUSE IF NOT EXISTS CONSTRUCTION_WH
  WAREHOUSE_SIZE = 'SMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE;
```

### Step 2: Create Data Tables (RAW Schema)

```sql
USE SCHEMA RAW;

-- Sites table
CREATE OR REPLACE TABLE SITES (
    SITE_ID VARCHAR(50) PRIMARY KEY,
    SITE_NAME VARCHAR(200),
    SITE_TYPE VARCHAR(100),
    LATITUDE FLOAT,
    LONGITUDE FLOAT,
    STATUS VARCHAR(50)
);

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

-- Equipment Telematics
CREATE OR REPLACE TABLE EQUIPMENT_TELEMATICS (
    TELEMETRY_ID VARCHAR(50) PRIMARY KEY,
    EQUIPMENT_ID VARCHAR(50),
    TIMESTAMP TIMESTAMP_NTZ,
    ENGINE_LOAD_PERCENT FLOAT,
    FUEL_RATE_GPH FLOAT,
    PAYLOAD_TONS FLOAT
);

-- Cycle Events
CREATE OR REPLACE TABLE CYCLE_EVENTS (
    CYCLE_ID VARCHAR(50) PRIMARY KEY,
    EQUIPMENT_ID VARCHAR(50),
    SITE_ID VARCHAR(50),
    CYCLE_START TIMESTAMP_NTZ,
    CYCLE_END TIMESTAMP_NTZ,
    LOAD_VOLUME_YD3 FLOAT,
    CYCLE_TIME_MINUTES FLOAT,
    FUEL_CONSUMED_GAL FLOAT
);

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
```

### Step 3: Upload Semantic Model to Stage

```sql
USE DATABASE CONSTRUCTION_GEO_DB;
USE SCHEMA CONSTRUCTION_GEO;

-- Create stage for semantic model
CREATE OR REPLACE STAGE SEMANTIC_MODELS
  DIRECTORY = (ENABLE = TRUE);

-- Upload the semantic model (do this via Snowsight UI or SnowCLI):
-- PUT file://path/to/construction_semantic_model.yaml @SEMANTIC_MODELS;
```

**Via SnowCLI:**
```bash
snow stage copy cortex/construction_semantic_model.yaml @CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS
```

**Verify:**
```sql
LIST @CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS;
-- Should show: construction_semantic_model.yaml
```

### Step 4: Create Cortex Search Service (for Ghost Cycle Docs)

```sql
USE DATABASE CONSTRUCTION_GEO_DB;
USE SCHEMA DOCS;

-- Create document table for search
CREATE OR REPLACE TABLE EQUIPMENT_DOCS (
    DOC_ID VARCHAR(50) PRIMARY KEY,
    EQUIPMENT_TYPE VARCHAR(100),
    DOCUMENT_TITLE VARCHAR(500),
    CONTENT TEXT,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Insert sample docs
INSERT INTO EQUIPMENT_DOCS (DOC_ID, EQUIPMENT_TYPE, DOCUMENT_TITLE, CONTENT) VALUES
('DOC-001', 'haul_truck', 'Ghost Cycle Detection Protocol',
 'Ghost Cycles occur when haul trucks travel empty routes without productive hauling. Key indicators: engine load below 30% while vehicle speed exceeds 2 mph for extended periods. Root causes include: inefficient loading queue management, suboptimal haul road layouts, and poor material staging. Mitigation: Implement GPS-based route optimization and real-time load monitoring.'),
('DOC-002', 'haul_truck', 'Fuel Efficiency Best Practices',
 'Optimal fuel efficiency for haul trucks requires: maintaining 70-85% engine load during hauling, avoiding excessive idle time, and using downhill hauls for loaded trucks when possible. Monitor gallons per cycle and compare against baseline benchmarks.'),
('DOC-003', 'dozer', 'Dozer Productivity Guidelines',
 'Dozer productivity measured in cubic yards per hour. Factors affecting output: blade size, push distance, material type, and grade. Slot dozing increases efficiency by 15-20%. Avoid excessive ripping time - switch to ripper attachment for hard materials.');

-- Create Cortex Search Service
CREATE OR REPLACE CORTEX SEARCH SERVICE CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS_SEARCH
ON CONTENT
ATTRIBUTES EQUIPMENT_TYPE, DOCUMENT_TITLE
WAREHOUSE = CONSTRUCTION_WH
TARGET_LAG = '1 hour'
AS (
    SELECT DOC_ID, EQUIPMENT_TYPE, DOCUMENT_TITLE, CONTENT
    FROM CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS
);

-- Verify
SHOW CORTEX SEARCH SERVICES IN DATABASE CONSTRUCTION_GEO_DB;
```

### Step 5: Create the Cortex Agent (TERRA_COPILOT)

**Option A: Via Snowsight UI** (Recommended for first time)

1. Go to **Snowsight → AI & ML → Cortex Agents**
2. Click **"Create Agent"**
3. Configure:
   - **Name:** `TERRA_COPILOT`
   - **Database:** `CONSTRUCTION_GEO_DB`
   - **Schema:** `CONSTRUCTION_GEO`
   - **Model:** `mistral-large` (or `llama3.1-70b`)
   - **Instructions:**
     ```
     You are TERRA, an AI assistant for construction geospatial analytics.
     You help site managers, equipment operators, and analysts understand:
     - Equipment utilization and Ghost Cycles
     - Haul road efficiency and cycle times
     - Cut/fill volume progress vs plan
     - Fleet productivity optimization
     
     IMPORTANT: When asked about "Ghost Cycles" or "hidden patterns", look for 
     equipment operating with high speed but low engine load - this indicates 
     empty hauls that waste fuel and time.
     
     Always provide actionable recommendations, not just data.
     ```
   - **Tools:**
     1. **Cortex Analyst (Text-to-SQL)**
        - Name: `data_analyst`
        - Semantic Model: `@CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS/construction_semantic_model.yaml`
     2. **Cortex Search**
        - Name: `equipment_docs`
        - Service: `CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS_SEARCH`

4. Click **Create**

**Option B: Via Python API**

```python
from snowflake.core import Root
from snowflake.core.cortex.agent import CortexAgent, CortexAgentTool
from snowflake.snowpark import Session

def deploy_terra_agent(session):
    """Deploy TERRA Copilot agent."""
    
    agent = CortexAgent(
        name="TERRA_COPILOT",
        description="AI assistant for construction geospatial analytics with Ghost Cycle detection",
        model="mistral-large",
        instructions="""You are TERRA, an AI assistant for construction geospatial analytics.
You help site managers understand equipment utilization, haul efficiency, and Ghost Cycles.

IMPORTANT: Ghost Cycles are when equipment travels empty (high speed, low engine load).
Always look for patterns in the telematics data when asked about efficiency or hidden issues.""",
        tools=[
            CortexAgentTool(
                tool_type="cortex_analyst_text_to_sql",
                name="data_analyst",
                spec={
                    "semantic_model": "@CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS/construction_semantic_model.yaml",
                    "description": "Query geospatial and equipment data"
                }
            ),
            CortexAgentTool(
                tool_type="cortex_search",
                name="equipment_docs",
                spec={
                    "service": "CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS_SEARCH",
                    "max_results": 5,
                    "description": "Search equipment documentation and best practices"
                }
            )
        ]
    )
    
    root = Root(session)
    agents = root.databases["CONSTRUCTION_GEO_DB"].schemas["CONSTRUCTION_GEO"].cortex_agents
    agents.create(agent, mode="or_replace")
    
    print("✅ TERRA_COPILOT deployed!")

# Run with:
# session = Session.builder.configs({"connection_name": "your_conn"}).create()
# deploy_terra_agent(session)
```

### Step 6: Create External Access Integration (for Map Tiles)

```sql
-- Allow the SPCS service to fetch map tiles from OpenStreetMap
CREATE OR REPLACE NETWORK RULE TERRA_MAP_NETWORK_RULE
  MODE = EGRESS
  TYPE = HOST_PORT
  VALUE_LIST = ('a.tile.openstreetmap.org:443', 'b.tile.openstreetmap.org:443', 'c.tile.openstreetmap.org:443');

CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION TERRA_MAP_TILES_ACCESS
  ALLOWED_NETWORK_RULES = (TERRA_MAP_NETWORK_RULE)
  ENABLED = TRUE;
```

### Step 7: Create App Role and Grants

```sql
-- Create role for the SPCS service
CREATE ROLE IF NOT EXISTS TERRA_APP_ROLE;

-- Grant necessary permissions
GRANT USAGE ON DATABASE CONSTRUCTION_GEO_DB TO ROLE TERRA_APP_ROLE;
GRANT USAGE ON ALL SCHEMAS IN DATABASE CONSTRUCTION_GEO_DB TO ROLE TERRA_APP_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA CONSTRUCTION_GEO_DB.RAW TO ROLE TERRA_APP_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA CONSTRUCTION_GEO_DB.DOCS TO ROLE TERRA_APP_ROLE;

-- Grant Cortex Agent access
GRANT USAGE ON CORTEX AGENT CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.TERRA_COPILOT TO ROLE TERRA_APP_ROLE;
GRANT USAGE ON CORTEX SEARCH SERVICE CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS_SEARCH TO ROLE TERRA_APP_ROLE;

-- Grant warehouse
GRANT USAGE ON WAREHOUSE CONSTRUCTION_WH TO ROLE TERRA_APP_ROLE;
```

---

## ✅ VERIFICATION

After completing all steps, verify in Snowsight:

```sql
-- 1. Verify agent exists
SHOW CORTEX AGENTS IN SCHEMA CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO;
-- Should show: TERRA_COPILOT

-- 2. Verify search service exists
SHOW CORTEX SEARCH SERVICES IN DATABASE CONSTRUCTION_GEO_DB;
-- Should show: EQUIPMENT_DOCS_SEARCH

-- 3. Verify semantic model is staged
LIST @CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS;
-- Should show: construction_semantic_model.yaml

-- 4. Test the agent manually
-- In Snowsight Agents tab, open TERRA_COPILOT and ask:
-- "What is the average cycle time by equipment type?"
-- "Tell me about Ghost Cycles"
```

---

## 🔄 AFTER SNOWFLAKE SETUP

Once the agent exists, your code will work:

1. `cortex_agent_client.py` calls the REST API
2. `TERRA_COPILOT` receives the message
3. Agent uses Cortex Analyst to generate SQL
4. Agent uses Cortex Search for documents
5. SSE stream returns thinking steps + results
6. Frontend displays response with charts

**No code changes needed** - just create the Snowflake objects!

---

## 🐛 DEBUGGING

If chat still doesn't work after setup:

1. **Check SPCS logs:**
   ```sql
   SELECT * FROM TABLE(CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.terra_service!GET_SERVICE_LOGS('terra', 0, 100));
   ```

2. **Verify env vars in SPCS:**
   - `SNOWFLAKE_HOST` must be set (e.g., `myaccount.snowflakecomputing.com`)
   - `SNOWFLAKE_DATABASE` = `CONSTRUCTION_GEO_DB`
   - `SNOWFLAKE_SCHEMA` = `CONSTRUCTION_GEO`

3. **Check token path:**
   - The SPCS container must have `/snowflake/session/token` 
   - This is automatic in SPCS but fails locally

4. **Test agent endpoint directly:**
   ```bash
   curl -X POST "https://YOUR_ACCOUNT.snowflakecomputing.com/api/v2/databases/CONSTRUCTION_GEO_DB/schemas/CONSTRUCTION_GEO/agents/TERRA_COPILOT:run" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": [{"type": "text", "text": "Hello"}]}]}'
   ```
