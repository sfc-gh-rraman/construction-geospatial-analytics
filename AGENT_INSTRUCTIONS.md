# 🌍 TERRA Geospatial Analytics - Developer Instructions

## Your Mission

Make the TERRA chat interface work with **real Cortex AI services** instead of hardcoded fallbacks.

Currently, when users ask questions like "What's the average cycle time?", they get pre-wired responses. After completing these steps, they'll get **real AI-powered answers** using Cortex Analyst (text-to-SQL) and Cortex Search (semantic document search).

---

## 🚨 THE PROBLEM

Your `cortex_agent_client.py` is correctly calling:
```
POST /api/v2/databases/CONSTRUCTION_GEO_DB/schemas/CONSTRUCTION_GEO/agents/TERRA_COPILOT:run
```

**But `TERRA_COPILOT` doesn't exist in Snowflake!**

Result:
1. API returns 404
2. Frontend falls back to `/api/chat` (old orchestrator)
3. Orchestrator uses keyword-matching `direct_sql_query()`
4. User gets pre-wired responses, not real AI

---

## ✅ STEP-BY-STEP FIX

### Step 1: Create Database (if not exists)

Open **Snowsight** → **SQL Worksheet** and run:

```sql
CREATE DATABASE IF NOT EXISTS CONSTRUCTION_GEO_DB;
CREATE WAREHOUSE IF NOT EXISTS CONSTRUCTION_WH 
  WAREHOUSE_SIZE = 'SMALL' 
  AUTO_SUSPEND = 60 
  AUTO_RESUME = TRUE;
```

### Step 2: Run Data Setup Script

Copy the contents of `cortex/deploy_data.sql` into Snowsight and execute.

This creates:
- `RAW.SITES` - Construction site locations
- `RAW.EQUIPMENT` - Haul trucks, dozers, loaders
- `RAW.GPS_BREADCRUMBS` - Real-time GPS positions
- `RAW.EQUIPMENT_TELEMATICS` - Engine load, fuel rate, payload
- `RAW.CYCLE_EVENTS` - Load/haul/dump cycles with Ghost Cycle flags
- `RAW.VOLUME_SURVEYS` - Cut/fill progress tracking
- Views for Ghost Cycle analysis

**Verify:**
```sql
SELECT COUNT(*) FROM CONSTRUCTION_GEO_DB.RAW.SITES;  -- Should return 6
SELECT COUNT(*) FROM CONSTRUCTION_GEO_DB.RAW.EQUIPMENT;  -- Should return 20
```

### Step 3: Run Search Service Setup

Copy the contents of `cortex/deploy_search.sql` into Snowsight and execute.

This creates:
- `DOCS.EQUIPMENT_DOCS` - Documentation about Ghost Cycles, fuel efficiency, etc.
- `EQUIPMENT_DOCS_SEARCH` - Cortex Search service for semantic document search

**Verify:**
```sql
SHOW CORTEX SEARCH SERVICES IN DATABASE CONSTRUCTION_GEO_DB;
-- Should show: EQUIPMENT_DOCS_SEARCH
```

### Step 4: Run Agent Setup Script

Copy the contents of `cortex/deploy_agent.sql` into Snowsight and execute.

This creates:
- `CONSTRUCTION_GEO.SEMANTIC_MODELS` stage
- `TERRA_APP_ROLE` with permissions
- `TERRA_MAP_TILES_ACCESS` external access integration

### Step 5: Upload Semantic Model to Stage

**Option A - Via Snowsight UI:**
1. Go to **Data** → **Databases** → **CONSTRUCTION_GEO_DB** → **CONSTRUCTION_GEO** → **Stages**
2. Click **SEMANTIC_MODELS**
3. Click **+ Files** → Upload `cortex/construction_semantic_model.yaml`

**Option B - Via SnowCLI:**
```bash
cd construction_geospatial_analytics
snow stage copy cortex/construction_semantic_model.yaml @CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS
```

**Verify:**
```sql
LIST @CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS;
-- Should show: construction_semantic_model.yaml
```

### Step 6: Create the Cortex Agent (CRITICAL!)

This is the step that makes everything work.

1. Go to **Snowsight** → **AI & ML** → **Cortex Agents** (left sidebar)
2. Click **+ Create**
3. Fill in:

| Field | Value |
|-------|-------|
| **Name** | `TERRA_COPILOT` |
| **Database** | `CONSTRUCTION_GEO_DB` |
| **Schema** | `CONSTRUCTION_GEO` |
| **Model** | `mistral-large` (or `llama3.1-70b`) |

4. In **Instructions**, paste:

```
You are TERRA, an AI assistant for construction geospatial analytics.

You help site managers, equipment operators, and fleet analysts understand:
- Equipment utilization and Ghost Cycle detection
- Haul road efficiency and optimal cycle times
- Cut/fill volume progress vs plan
- Fleet productivity and fuel efficiency

HIDDEN DISCOVERY - GHOST CYCLES:
When asked about "Ghost Cycles", "hidden patterns", or "wasted fuel", analyze the data for:
- Equipment with HIGH SPEED (>2 mph) but LOW ENGINE LOAD (<30%)
- This indicates empty hauls - trucks traveling without productive loads
- Quantify impact: wasted fuel gallons, lost hours, dollar impact

Always provide:
1. The data/numbers requested
2. Context about what it means
3. Actionable recommendations
```

5. Click **Add Tool** → **Cortex Analyst**:
   - Name: `data_analyst`
   - Semantic Model: `@CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS/construction_semantic_model.yaml`
   - Description: `Query geospatial and equipment telemetry data`

6. Click **Add Tool** → **Cortex Search**:
   - Name: `equipment_docs`
   - Service: `CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS_SEARCH`
   - Max Results: `5`
   - Description: `Search equipment documentation and best practices`

7. Click **Create**

**Verify agent exists:**
```sql
SHOW CORTEX AGENTS IN SCHEMA CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO;
-- Should show: TERRA_COPILOT
```

### Step 7: Grant Agent Access to App Role

```sql
GRANT USAGE ON CORTEX AGENT CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.TERRA_COPILOT 
  TO ROLE TERRA_APP_ROLE;
```

### Step 8: Test Agent in Snowsight

Before deploying the app, test the agent directly:

1. Go to **AI & ML** → **Cortex Agents**
2. Click **TERRA_COPILOT**
3. In the chat panel, ask:
   - "What is the average cycle time by equipment type?"
   - "Show me sites with the most Ghost Cycles"
   - "What causes Ghost Cycles?"

You should see:
- Thinking steps (planning, SQL generation)
- SQL query executed
- Results with natural language explanation
- Charts/visualizations for numeric data

### Step 9: Deploy SPCS Service

```bash
cd construction_geospatial_analytics/copilot/deploy
./deploy.sh all
```

### Step 10: Verify in Browser

1. Get service URL:
```sql
SHOW ENDPOINTS IN SERVICE CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.terra_service;
```

2. Open the URL in browser
3. Go to Chat
4. Ask: "What's the average cycle time by site?"
5. You should see streaming response with thinking steps!

---

## 🔍 TROUBLESHOOTING

### "404 Not Found" or agent not responding

The agent doesn't exist. Go back to Step 6.

### "400 Bad Request" errors

Check the request body format. The content must be an array:
```json
{
  "messages": [{
    "role": "user", 
    "content": [{"type": "text", "text": "your question"}]
  }]
}
```
NOT:
```json
{
  "messages": [{
    "role": "user", 
    "content": "your question"  // WRONG - must be array!
  }]
}
```

Your `cortex_agent_client.py` already handles this correctly.

### Chat shows fallback responses (generic, not data-driven)

1. Check SPCS logs for errors:
```sql
SELECT * FROM TABLE(CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.terra_service!GET_SERVICE_LOGS('terra', 0, 100));
```

2. Verify environment variables are set in service spec:
   - `SNOWFLAKE_HOST`
   - `SNOWFLAKE_DATABASE` = `CONSTRUCTION_GEO_DB`

3. Verify token path exists (should be automatic in SPCS):
   - `/snowflake/session/token`

### Semantic model errors

1. Verify file is uploaded:
```sql
LIST @CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS;
```

2. Verify YAML syntax is valid
3. Verify table names match actual tables in RAW schema

### Search returns no results

1. Verify search service exists:
```sql
SHOW CORTEX SEARCH SERVICES IN DATABASE CONSTRUCTION_GEO_DB;
```

2. Verify documents exist:
```sql
SELECT COUNT(*) FROM CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS;
```

3. Test search directly:
```sql
SELECT * FROM TABLE(
  CONSTRUCTION_GEO_DB.DOCS.EQUIPMENT_DOCS_SEARCH(
    QUERY => 'Ghost Cycle detection',
    LIMIT => 5
  )
);
```

---

## 📁 FILE REFERENCE

| File | What It Does |
|------|--------------|
| `cortex/deploy_data.sql` | Creates RAW schema tables + synthetic data |
| `cortex/deploy_search.sql` | Creates DOCS schema + Cortex Search service |
| `cortex/deploy_agent.sql` | Creates stage, role, grants |
| `cortex/construction_semantic_model.yaml` | Defines data model for Cortex Analyst |
| `cortex/SETUP_GUIDE.md` | Detailed technical guide |
| `copilot/backend/services/cortex_agent_client.py` | REST API client for Cortex Agent |
| `copilot/frontend/src/components/Chat.tsx` | Frontend chat with SSE streaming |

---

## 🎯 SUCCESS CRITERIA

When complete, users should be able to:

1. ✅ Ask "What's the average cycle time by equipment type?" → Get real SQL-generated answer
2. ✅ Ask "Show me Ghost Cycles" → Get data-driven analysis with percentages
3. ✅ Ask "What causes Ghost Cycles?" → Get search results from documentation
4. ✅ See "thinking steps" while agent reasons through the question
5. ✅ See SQL queries that were executed
6. ✅ See charts/visualizations for numeric results

---

## 💡 KEY INSIGHT

The code is already correct! You just need to create the Snowflake objects (database, tables, search service, agent). Once `TERRA_COPILOT` exists, the streaming chat will work automatically.

**No code changes required** - just Snowflake setup.
