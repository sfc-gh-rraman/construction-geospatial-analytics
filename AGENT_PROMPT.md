# Agent Prompt: Build TERRA - Geospatial Analytics Demo

## Context

You are building **TERRA** (Terrain & Equipment Route Resource Advisor), a "shock and awe" demo for Snowflake showcasing Geospatial Analytics for Construction & Equipment. This demo should replicate the architecture, patterns, and quality of the **ATLAS Capital Delivery** demo that has already been built.

**Reference Demo Location:** `/Users/rraman/Documents/construction_demos/construction/construction_capital_delivery/copilot`
**Your Project Location:** `/Users/rraman/Documents/construction_demos/construction/construction_geospatial_analytics`
**Handoff Document:** `/Users/rraman/Documents/construction_demos/construction/construction_geospatial_analytics/HANDOFF_FROM_CAPITAL_DELIVERY.md`
**DRD:** `/Users/rraman/Documents/construction_demos/construction/construction_geospatial_analytics/DRD.md`

---

## Your Mission

Build a full-stack agentic AI demo with:
1. **React Frontend** - 8 pages, dark navy theme, interactive maps
2. **FastAPI Backend** - Multi-agent system with Cortex integration
3. **Snowflake Data** - Synthetic data with real lat/long coordinates
4. **Cortex AI** - Agent with Analyst (text-to-SQL) and Search tools
5. **ML Models** - Ghost Cycle detection, Cycle Time optimization
6. **SPCS Deployment** - Containerized service

---

## Technical Requirements

### Frontend Pages (8 total)
1. **Landing** - Hero with typing animation, stats, CTAs (copy from ATLAS, rebrand)
2. **Regional Command** - Strategic dashboard with portfolio map + chat
3. **Site Operations** - Live equipment map with haul road traffic
4. **Equipment Deep Dive** - Single asset detail view
5. **Earthwork Analytics** - Cut/fill analysis + **Hidden Discovery: Ghost Cycles**
6. **Daily Site Brief** - AI-generated morning summary
7. **Document Search** - Cortex Search for geotechnical reports
8. **Architecture** - Interactive SVG system diagram (copy from ATLAS)

### Backend Agents
- **Orchestrator** - Routes intents to specialized agents
- **Fleet Watchdog** - Monitor equipment KPIs
- **Route Advisor** - Haul road optimization recommendations
- **Terrain Analyst** - Cut/fill volume analysis
- **Cycle Predictor** - Ghost Cycle detection

### Critical Files to Copy from ATLAS
```
capital_delivery/copilot/backend/services/cortex_agent_client.py → geospatial/copilot/backend/services/
capital_delivery/copilot/frontend/src/components/Chat.tsx → geospatial/copilot/frontend/src/components/
capital_delivery/copilot/frontend/src/components/VegaChart.tsx → geospatial/copilot/frontend/src/components/
capital_delivery/copilot/frontend/src/pages/Landing.tsx → geospatial/copilot/frontend/src/pages/
capital_delivery/copilot/frontend/src/pages/Architecture.tsx → geospatial/copilot/frontend/src/pages/
capital_delivery/copilot/frontend/src/styles/globals.css → geospatial/copilot/frontend/src/styles/
capital_delivery/copilot/deploy/Dockerfile → geospatial/copilot/deploy/
capital_delivery/copilot/deploy/nginx.conf → geospatial/copilot/deploy/
```

---

## Critical Technical Fixes (MUST APPLY)

### 1. Cortex Agent API Request Format
```python
# WRONG ❌
{"messages": [{"role": "user", "content": "query string"}]}

# CORRECT ✅
{"messages": [{"role": "user", "content": [{"type": "text", "text": "query string"}]}]}
```

### 2. SPCS Token Auto-Reconnection
Add to snowflake_service_spcs.py to handle idle timeout:
```python
def _reconnect_if_needed(self):
    try:
        self.session.sql("SELECT 1").collect()
    except Exception as e:
        if "390114" in str(e) or "token" in str(e).lower():
            self._init_snowpark_session()
        else:
            raise
```

### 3. Leaflet Map Setup
- Use CARTO dark tiles: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- Import CSS: `import 'leaflet/dist/leaflet.css'`
- Create External Access Integration for map tiles

### 4. Docker Build
Always use: `docker build --platform linux/amd64 --no-cache`

### 5. Chart Spec Parsing
`chart_spec` from Cortex Agent comes as JSON string - must `json.loads()` it

---

## The "Wow" Moment: Ghost Cycle Detection

**Discovery Statement:** "A 'Ghost Cycle' pattern (equipment moving but not hauling) is detected by correlating GPS breadcrumbs with engine load telematics, revealing a specific site layout inefficiency causing 20% fuel waste."

SQL Pattern:
```sql
WITH ghost_cycles AS (
    SELECT 
        a.ASSET_ID, e.ASSET_NAME,
        COUNT(*) as ghost_count,
        SUM(a.FUEL_BURN) as wasted_fuel
    FROM ASSET_ACTIVITY_LOG a
    JOIN ASSET e ON a.ASSET_ID = e.ASSET_ID
    WHERE a.ACTIVITY_STATE = 'IDLING'
      AND EXISTS (
          SELECT 1 FROM EQUIPMENT_GPS g
          WHERE g.ASSET_ID = a.ASSET_ID
          AND ABS(DATEDIFF('second', g.TIMESTAMP, a.TIMESTAMP)) < 60
          AND g.SPEED > 2  -- Moving but idling = Ghost Cycle!
      )
    GROUP BY a.ASSET_ID, e.ASSET_NAME
    HAVING COUNT(*) > 10
)
SELECT * FROM ghost_cycles ORDER BY wasted_fuel DESC
```

---

## Synthetic Data Requirements

Generate data with:
- 8-10 construction sites with **real US lat/long coordinates**
- 50+ pieces of equipment (CAT 793 trucks, dozers, graders)
- GPS breadcrumbs at 30-second intervals
- Engine telemetry (RPM, fuel rate, load %)
- Include Ghost Cycle patterns: GPS shows movement, engine load < 20%
- Haul road segments with congestion patterns

---

## Database Schema

```
CONSTRUCTION_GEO_DB
├── RAW
│   ├── EQUIPMENT_GPS
│   ├── ENGINE_TELEMETRY
│   └── DRONE_SURVEY_TIFF
├── ATOMIC
│   ├── ASSET
│   ├── LOCATION
│   ├── PROJECT
│   ├── ASSET_ACTIVITY_LOG
│   └── VOLUME_METRIC
├── CONSTRUCTION_GEO (Data Mart)
│   ├── HAUL_ROAD_EFFICIENCY
│   ├── FLEET_UTILIZATION
│   └── SITE_PROGRESS
├── SPCS
│   └── TERRA_IMAGES
├── ML
│   └── (ML model artifacts)
└── DOCS
    └── (Geotechnical reports for search)
```

---

## Deployment Steps

1. **Read the handoff document thoroughly**
2. **Copy critical files from ATLAS**
3. **Generate synthetic data with real coordinates**
4. **Create DDL and load data**
5. **Deploy Cortex services (Semantic Model, Search)**
6. **Create Cortex Agent in Snowsight UI** (not via API - preview limitation)
7. **Build frontend with `npm run build`**
8. **Build Docker: `docker build --platform linux/amd64`**
9. **Push to Snowflake registry**
10. **Create service with External Access Integration for maps**

---

## Success Criteria

- [ ] Landing page with TERRA branding and typing animation
- [ ] Regional Command shows multi-site map with equipment locations
- [ ] Site Operations shows live haul road traffic with congestion colors
- [ ] Earthwork Analytics reveals Ghost Cycle pattern
- [ ] Chat works with Cortex Agent (streaming responses, charts)
- [ ] Maps render with real tile layers (not blank)
- [ ] Architecture page is interactive with clickable components
- [ ] Service stays alive after idle (auto-reconnection works)

---

## Start Here

1. First, read the DRD.md and HANDOFF_FROM_CAPITAL_DELIVERY.md
2. Examine the existing code structure in the copilot folder
3. Compare with the ATLAS reference at `/Users/rraman/Documents/construction_demos/construction/construction_capital_delivery/copilot`
4. Begin by copying the critical files listed above
5. Adapt the snowflake_service_spcs.py for geospatial queries
6. Generate synthetic data with Ghost Cycle patterns
7. Build and deploy incrementally, testing each component

Good luck building TERRA! 🌍🚜
