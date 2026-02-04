# Handoff Document: Geospatial Analytics (TERRA)
## From Capital Delivery (ATLAS) Learnings

---

## 🎯 Executive Summary

This document captures all learnings, patterns, fixes, and reusable code from the **Capital Delivery (ATLAS)** demo to guide the development of **Geospatial Analytics (TERRA)**. The ATLAS demo is now fully operational with:

- ✅ 8-page React frontend with dark navy theme
- ✅ Cortex Agent integration with SSE streaming
- ✅ Interactive Leaflet maps with real coordinates
- ✅ ML models (XGBoost) with SHAP explanations
- ✅ "Hidden Discovery" pattern detection
- ✅ Full SPCS deployment with external access

**Recommended Co-Pilot Name:** TERRA (Terrain & Equipment Route Resource Advisor)

---

## 📐 Architecture Patterns to Replicate

### 1. Frontend Structure (8 Pages)

| ATLAS Page | TERRA Equivalent | Purpose |
|------------|------------------|---------|
| Landing | Landing | Hero page with typing animation, stats, CTAs |
| Mission Control | Regional Command | Strategic dashboard with chat + KPIs |
| Portfolio Map | Site Operations Map | **CRITICAL** - Leaflet map with equipment locations |
| Project Deep Dive | Equipment Deep Dive | Single asset/site detail view |
| Scope Forensics | Earthwork Analytics | **Hidden Discovery** - Ghost Cycle detection |
| Morning Brief | Daily Site Brief | AI-generated morning summary |
| Knowledge Base | Document Search | Cortex Search for geotechnical reports |
| Architecture | Architecture | Interactive SVG system diagram |

### 2. Backend Agent Structure

```
backend/
├── agents/
│   ├── orchestrator.py      # Routes intents to specialized agents
│   ├── fleet_watchdog.py    # Monitor equipment KPIs (like portfolio_agent)
│   ├── route_advisor.py     # Haul road optimization (like scope_agent)
│   ├── terrain_analyst.py   # Cut/fill analysis (new)
│   └── cycle_predictor.py   # Ghost cycle detection (like risk_agent)
├── services/
│   ├── snowflake_service_spcs.py  # CRITICAL - Copy & adapt
│   └── cortex_agent_client.py     # CRITICAL - Copy exactly
```

---

## 🔧 Critical Technical Fixes (MUST APPLY)

### Fix #1: SPCS Token Auto-Reconnection

**Problem:** Service dies after idle timeout (~15 mins) due to OAuth token expiration.

**Solution:** Add to `snowflake_service_spcs.py`:

```python
def _reconnect_if_needed(self):
    """Auto-reconnect if token expired."""
    try:
        # Test connection
        self.session.sql("SELECT 1").collect()
    except Exception as e:
        if "390114" in str(e) or "token" in str(e).lower():
            logger.warning("Token expired, reconnecting...")
            self._init_snowpark_session()
        else:
            raise

def execute_query(self, sql: str) -> List[Dict[str, Any]]:
    """Execute with auto-reconnect."""
    self._reconnect_if_needed()
    # ... rest of query logic
```

### Fix #2: Leaflet Map Rendering

**Problem:** Map shows blank screen - tiles don't load.

**Solution:** 
1. Use CARTO dark tiles (more reliable than OSM):
```tsx
<TileLayer
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  attribution='&copy; CARTO'
  subdomains="abcd"
/>
```

2. Import Leaflet CSS in component:
```tsx
import 'leaflet/dist/leaflet.css'
```

3. Create External Access Integration in Snowflake:
```sql
CREATE OR REPLACE NETWORK RULE TERRA_MAP_TILES_RULE
  MODE = EGRESS
  TYPE = HOST_PORT
  VALUE_LIST = ('a.basemaps.cartocdn.com:443', 'b.basemaps.cartocdn.com:443', 
                'c.basemaps.cartocdn.com:443', 'd.basemaps.cartocdn.com:443');

CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION TERRA_MAP_TILES_ACCESS
  ALLOWED_NETWORK_RULES = (TERRA_MAP_TILES_RULE)
  ENABLED = TRUE;
```

4. Add to service creation:
```sql
CREATE SERVICE ... EXTERNAL_ACCESS_INTEGRATIONS = (TERRA_MAP_TILES_ACCESS);
```

### Fix #3: Cortex Agent API Integration

**Problem:** 400 errors when calling Cortex Agent REST API.

**Solution:** The request body MUST have content as array of objects:

```python
# WRONG ❌
{"messages": [{"role": "user", "content": "What is..."}]}

# CORRECT ✅
{"messages": [{"role": "user", "content": [{"type": "text", "text": "What is..."}]}]}
```

Copy `cortex_agent_client.py` exactly from capital_delivery.

### Fix #4: SSE Streaming & Chart Display

**Problem:** Charts from Cortex Agent not displaying.

**Solution:** `chart_spec` comes as JSON string, must parse:

```python
elif event_type == "response.chart":
    result["type"] = "chart"
    chart_spec_raw = data.get("chart_spec")
    if isinstance(chart_spec_raw, str):
        result["chart_spec"] = json.loads(chart_spec_raw)  # Parse string!
    else:
        result["chart_spec"] = chart_spec_raw
```

### Fix #5: Docker Build for SPCS

**Problem:** Service fails with "amd64 architecture" error.

**Solution:** Always build with platform flag:
```bash
docker build --platform linux/amd64 --no-cache -t terra-geo:latest -f deploy/Dockerfile .
```

---

## 📊 Geospatial-Specific Recommendations

### Map Features for TERRA

1. **Equipment Tracking Map** (like PortfolioMap.tsx):
   - Real-time dots showing equipment positions
   - Color by status: Hauling (green), Idling (yellow), Stuck (red)
   - Circle size by fuel burn rate
   - Popup with: Equipment ID, Operator, Current Activity, Cycle Time

2. **Haul Road Overlay**:
   - Use Leaflet `Polyline` for road segments
   - Color-code by congestion (green → red gradient)
   - Show "Choke Point" markers with alert icons

3. **Terrain Heatmap**:
   - Use Leaflet heatmap plugin for cut/fill visualization
   - Overlay drone orthomosaic as `ImageOverlay`

### Hidden Discovery: "Ghost Cycle" Detection

Adapt the "Grounding Pattern" logic:

```python
def get_ghost_cycle_pattern(self) -> Dict[str, Any]:
    """Detect Ghost Cycles - equipment moving but engine load < 20%."""
    sql = f"""
    WITH ghost_cycles AS (
        SELECT 
            a.ASSET_ID,
            e.ASSET_NAME,
            COUNT(*) as ghost_count,
            SUM(a.FUEL_BURN) as wasted_fuel,
            AVG(a.FUEL_BURN) as avg_fuel_per_ghost
        FROM {self.database}.{self.schema}.ASSET_ACTIVITY_LOG a
        JOIN {self.database}.{self.schema}.ASSET e ON a.ASSET_ID = e.ASSET_ID
        WHERE a.ACTIVITY_STATE = 'IDLING'
          AND EXISTS (
              SELECT 1 FROM {self.database}.{self.schema}.EQUIPMENT_GPS g
              WHERE g.ASSET_ID = a.ASSET_ID
              AND ABS(DATEDIFF('second', g.TIMESTAMP, a.TIMESTAMP)) < 60
              AND g.SPEED > 2  -- Moving but idling!
          )
        GROUP BY a.ASSET_ID, e.ASSET_NAME
        HAVING COUNT(*) > 10
    )
    SELECT * FROM ghost_cycles ORDER BY wasted_fuel DESC
    """
    return self.execute_query(sql)
```

---

## 🗂️ Files to Copy Directly

| Source (capital_delivery) | Destination (geospatial) | Notes |
|---------------------------|--------------------------|-------|
| `backend/services/cortex_agent_client.py` | Same path | Copy exactly |
| `backend/services/snowflake_service_spcs.py` | Same path | Adapt queries |
| `frontend/src/components/Chat.tsx` | Same path | Copy exactly |
| `frontend/src/components/VegaChart.tsx` | Same path | Copy exactly |
| `frontend/src/pages/Landing.tsx` | Same path | Change branding |
| `frontend/src/pages/Architecture.tsx` | Same path | Update components |
| `frontend/src/styles/globals.css` | Same path | Copy popup styles |
| `deploy/Dockerfile` | Same path | Change app name |
| `deploy/nginx.conf` | Same path | Copy exactly |
| `deploy/supervisord.conf` | Same path | Copy exactly |

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Create database: `CONSTRUCTION_GEO_DB`
- [ ] Create schemas: `RAW`, `ATOMIC`, `CONSTRUCTION_GEO`, `SPCS`, `ML`
- [ ] Generate synthetic data with real lat/long for site locations
- [ ] Create Cortex Agent in Snowsight UI (not via API - preview limitation)
- [ ] Create External Access Integration for map tiles
- [ ] Create Compute Pool: `TERRA_COMPUTE_POOL`

### Build & Push
```bash
# Build for amd64
docker build --platform linux/amd64 --no-cache -t terra-geo:latest -f deploy/Dockerfile .

# Login to registry
snow spcs image-registry login --connection demo

# Tag & push
REPO="<account>.registry.snowflakecomputing.com/construction_geo_db/spcs/terra_images"
docker tag terra-geo:latest $REPO/terra-geo:latest
docker push $REPO/terra-geo:latest
```

### Create Service
```sql
CREATE SERVICE CONSTRUCTION_GEO_DB.SPCS.TERRA_SERVICE
IN COMPUTE POOL TERRA_COMPUTE_POOL
FROM SPECIFICATION $$
spec:
  containers:
    - name: terra
      image: <repo>/terra-geo:latest
      env:
        SNOWFLAKE_DATABASE: CONSTRUCTION_GEO_DB
        SNOWFLAKE_SCHEMA: ATOMIC
        LOG_LEVEL: INFO
      resources:
        requests:
          memory: 2Gi
          cpu: 1
        limits:
          memory: 4Gi
          cpu: 2
      readinessProbe:
        port: 8080
        path: /health
  endpoints:
    - name: terra-endpoint
      port: 8080
      public: true
$$
MIN_INSTANCES = 1
MAX_INSTANCES = 1
EXTERNAL_ACCESS_INTEGRATIONS = (TERRA_MAP_TILES_ACCESS);
```

---

## 📝 Cortex Agent Configuration

Create in Snowsight UI → AI & ML → Cortex Agents:

```yaml
Name: TERRA_COPILOT
Model: mistral-large2
Tools:
  - cortex_analyst:
      semantic_model: "@CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS/terra_semantic_model.yaml"
  - cortex_search:
      search_service: CONSTRUCTION_GEO_DB.DOCS.SITE_DOCS_SEARCH
      max_results: 5
      title_column: DOC_TITLE
      id_column: DOC_ID
System Prompt: |
  You are TERRA, an AI co-pilot for construction site geospatial analytics.
  Focus on equipment efficiency, haul road optimization, and earthwork progress.
  When discussing patterns, always reference the "Ghost Cycle" discovery capability.
```

---

## ⚠️ Common Pitfalls to Avoid

1. **Don't use `SNOWFLAKE.CORTEX.ANALYST()` SQL function** - It doesn't exist. Use Cortex Agent REST API or LLM text-to-SQL with `SNOWFLAKE.CORTEX.COMPLETE()`.

2. **Don't call Cortex Agent from stored procedures** - Only REST API from external apps.

3. **Don't forget `--platform linux/amd64`** - SPCS only supports amd64.

4. **Don't hardcode schema names** - Use environment variables.

5. **Don't skip the External Access Integration** - Maps won't work without it.

---

## 📞 Support Resources

- ATLAS Demo URL: `https://ayz3vu-sfpscogs-rraman-aws-si.snowflakecomputing.app`
- Reference code: `/Users/rraman/Documents/construction_demos/construction/construction_capital_delivery/copilot`
- Cortex Agents REST API docs: [Snowflake Docs](https://docs.snowflake.com/en/developer-guide/cortex-agents/rest-api)

---

*Generated from ATLAS Capital Delivery learnings - February 2026*
