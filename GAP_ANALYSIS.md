# TERRA Geospatial Analytics - Forensic Gap Analysis

**Date:** 2026-02-04  
**Reviewer:** Senior Developer  
**Reference:** Capital Delivery Demo (ATLAS) - Production-Ready  

---

## Executive Summary

The geospatial demo has foundational structure but **is NOT deployment-ready**. Critical gaps exist in:
1. Naming inconsistency (TERRA vs TERRA)
2. Missing Cortex Agent deployment
3. Placeholder map (not real Leaflet) in key pages
4. External access integration missing for map tiles
5. "Hidden Discovery" (Ghost Cycles) not properly showcased
6. Data pipeline incomplete

**Estimated effort to reach parity:** 2-3 days focused work

---

## 🔴 CRITICAL GAPS (Must Fix)

### 1. Naming Inconsistency
**Severity:** 🔴 High  
**Location:** Throughout project

| File | Uses |
|------|------|
| `deploy.sh` | `TERRA` |
| `001_database.sql` | `TERRA` |
| `Landing.tsx` | `TERRA` |
| `cortex_agent_client.py` | `TERRA_COPILOT` |
| `main.py` | `TERRA` |

**Fix:** Standardize to `TERRA` everywhere. Run global find/replace:
```bash
# In ddl/, deploy/, and backend/
s/TERRA/TERRA/g
s/terra/terra/g
```

---

### 2. SiteMap.tsx Uses FAKE Map
**Severity:** 🔴 High  
**Location:** `frontend/src/pages/SiteMap.tsx`

**Problem:** Lines 91-167 use a hand-drawn SVG with hardcoded positions, NOT real Leaflet:
```tsx
// BAD - This is what exists:
<div className="absolute inset-0 flex items-center justify-center">
  <div className="relative w-[600px] h-[400px] border border-earth-700 rounded-xl">
    {/* Grid lines */}
    <div className="absolute inset-0 grid grid-cols-6 grid-rows-4">
```

**Fix:** Replace with real `react-leaflet` like `RegionalOverview.tsx` does:
```tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

<MapContainer center={[33.44, -112.08]} zoom={14}>
  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
  {equipment.map(eq => (
    <Marker position={[eq.lat, eq.lng]} icon={...} />
  ))}
</MapContainer>
```

---

### 3. Missing External Access Integration
**Severity:** 🔴 High  
**Location:** `ddl/001_database.sql`, `deploy/deploy.sh`

**Problem:** Map tiles won't load in SPCS without network access.

**Fix:** Add to DDL:
```sql
-- In 001_database.sql or new 006_network_access.sql
CREATE OR REPLACE NETWORK RULE TERRA_MAP_TILES_RULE
  TYPE = HOST_PORT
  MODE = EGRESS
  VALUE_LIST = (
    'tile.openstreetmap.org:443',
    'a.basemaps.cartocdn.com:443',
    'b.basemaps.cartocdn.com:443',
    'c.basemaps.cartocdn.com:443',
    'd.basemaps.cartocdn.com:443'
  );

CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION TERRA_MAP_TILES_ACCESS
  ALLOWED_NETWORK_RULES = (TERRA_MAP_TILES_RULE)
  ENABLED = TRUE;
```

Add to `deploy.sh` service creation:
```bash
EXTERNAL_ACCESS_INTEGRATIONS = (TERRA_MAP_TILES_ACCESS)
```

---

### 4. Cortex Agent Not Deployed
**Severity:** 🔴 High  
**Location:** Missing `cortex/deploy_agent.sql`

**Problem:** The `cortex_agent_client.py` references `TERRA_COPILOT` agent but there's no deployment script.

**Fix:** Create `cortex/deploy_agent.sql`:
```sql
USE DATABASE CONSTRUCTION_GEO_DB;
USE SCHEMA CONSTRUCTION_GEO;

-- Upload semantic model first
PUT file:///path/to/construction_semantic_model.yaml 
    @CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS
    OVERWRITE = TRUE;

-- Create agent via Snowsight UI (API still in preview)
-- Go to: Snowsight > AI & ML > Cortex Agents > Create
-- Name: TERRA_COPILOT
-- Instructions: "You are TERRA, the construction site geospatial analytics assistant..."
-- Tools: Analyst (semantic model), Search (SITE_DOCUMENTS_SEARCH)
```

---

### 5. "Hidden Discovery" Not Showcased
**Severity:** 🔴 High  
**Location:** Frontend pages

**Problem:** Ghost Cycle detection is the "wow moment" but:
- No dedicated page for it
- `EarthworkProgress.tsx` doesn't mention Ghost Cycles
- No API endpoint integration for Ghost Cycle pattern

**Fix:** Create `GhostCycleAnalysis.tsx` page or add Ghost Cycle section to existing page:
```tsx
// Add to App.tsx pages:
case 'ghost':
  return <GhostCycleAnalysis />

// Create GhostCycleAnalysis.tsx with:
// - Real-time Ghost Cycle alerts
// - Fuel waste calculation
// - Equipment-level breakdown
// - The "156 Ghost Cycles = $47K wasted" revelation
```

---

## 🟡 MAJOR GAPS (Should Fix)

### 6. Missing Navigation Context
**Severity:** 🟡 Medium  
**Location:** `App.tsx`, all pages

**Problem:** Pages don't receive/use navigation context like ATLAS does:
```tsx
// ATLAS pattern:
export interface NavigationContext {
  onNavigate: (page: Page) => void
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
}

// TERRA pages just ignore props:
export function RegionalOverview(_props: Record<string, unknown>) {
```

**Fix:** Implement proper `NavigationContext` with `selectedSiteId`:
```tsx
export interface NavigationContext {
  onNavigate: (page: Page) => void
  selectedSiteId: string | null
  setSelectedSiteId: (id: string | null) => void
}
```

---

### 7. Data Not Loading from Backend
**Severity:** 🟡 Medium  
**Location:** Multiple pages

**Problem:** Pages use hardcoded mock data instead of fetching:

| Page | Issue |
|------|-------|
| `RegionalOverview.tsx` | `SITES` array hardcoded (line 8-14) |
| `EarthworkProgress.tsx` | All data hardcoded |
| `SiteMap.tsx` | Equipment hardcoded in useState |

**Fix:** Add `useEffect` to fetch from API:
```tsx
useEffect(() => {
  fetch('/api/sites')
    .then(res => res.json())
    .then(data => setSites(data.sites))
}, [])
```

---

### 8. Missing API-to-Database Alignment
**Severity:** 🟡 Medium  
**Location:** `main.py` vs DDL

**Problem:** API endpoints reference tables that may not exist:

| Endpoint | Expected Table | Status |
|----------|----------------|--------|
| `/api/ghost-cycles/{site_id}` | `ML.GHOST_CYCLE_PREDICTIONS` | ❌ Not in DDL |
| `/api/choke-points/{site_id}` | `ML.CHOKE_POINT_PREDICTIONS` | ❌ Not in DDL |
| `/api/cycle-time/optimal-params` | `CONSTRUCTION_GEO.OPTIMAL_CYCLE_PARAMS` | ❌ Not in DDL |
| `/api/ml/feature-importance/{model}` | `ML.GLOBAL_FEATURE_IMPORTANCE` | ❌ Not in DDL |

**Fix:** Add ML result tables to `005_ml_schema.sql`:
```sql
CREATE TABLE ML.GHOST_CYCLE_PREDICTIONS (
  PREDICTION_ID VARCHAR,
  EQUIPMENT_ID VARCHAR,
  SITE_ID VARCHAR,
  TIMESTAMP TIMESTAMP,
  IS_GHOST_CYCLE BOOLEAN,
  CONFIDENCE FLOAT,
  ESTIMATED_FUEL_WASTE_GAL FLOAT,
  ...
);
```

---

### 9. Semantic Model Not Uploaded
**Severity:** 🟡 Medium  
**Location:** `deploy/deploy.sh`

**Problem:** No step to upload `cortex/construction_semantic_model.yaml` to a stage.

**Fix:** Add to deploy.sh:
```bash
# Create stage for semantic models
snow sql -q "CREATE STAGE IF NOT EXISTS CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS 
  DIRECTORY = (ENABLE = TRUE);"

# Upload semantic model
snow sql -q "PUT file://${SCRIPT_DIR}/../cortex/construction_semantic_model.yaml 
  @CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS 
  OVERWRITE = TRUE AUTO_COMPRESS = FALSE;"
```

---

### 10. Snowflake Service Missing Methods
**Severity:** 🟡 Medium  
**Location:** `snowflake_service_spcs.py`

**Problem:** Methods referenced in `main.py` don't exist:
- `get_fleet_summary(site_id)` - exists but different signature
- `get_equipment_telemetry(site_id)` - missing
- `get_ghost_cycle_predictions(site_id)` - missing
- `search_documents(query, limit, document_type)` - missing

**Fix:** Add missing methods to `snowflake_service_spcs.py`:
```python
def get_equipment_telemetry(self, site_id: str) -> List[Dict]:
    sql = f"""
    SELECT e.EQUIPMENT_ID, e.EQUIPMENT_NAME, t.ENGINE_LOAD_PERCENT, t.FUEL_RATE_GPH, ...
    FROM {self.database}.RAW.EQUIPMENT e
    JOIN {self.database}.RAW.EQUIPMENT_TELEMATICS t ON e.EQUIPMENT_ID = t.EQUIPMENT_ID
    WHERE e.SITE_ID = '{site_id}'
    ORDER BY t.TIMESTAMP DESC
    """
    return self.execute_query(sql)
```

---

## 🟢 MINOR GAPS (Nice to Have)

### 11. Architecture Page Not Customized
**Severity:** 🟢 Low

The Architecture page should show TERRA's specific components (Ghost Cycle Detector, Choke Point Predictor, etc.) not generic boxes.

---

### 12. No Daily Briefing LLM Integration
**Severity:** 🟢 Low  
**Location:** `DailyBriefing.tsx`

The morning briefing should call Cortex Complete to generate a summary. Currently likely static.

---

### 13. Document Search Not Using Cortex Search
**Severity:** 🟢 Low  
**Location:** `DocumentSearch.tsx`, `snowflake_service_spcs.py`

Should use the `SITE_DOCUMENTS_SEARCH` Cortex Search service created in `004_cortex_services.sql`.

---

### 14. Missing Leaflet CSS in index.html
**Severity:** 🟢 Low

Add CDN link as backup:
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
```

---

## Deployment Checklist

Before deploying, ensure:

- [ ] All naming standardized to `TERRA`
- [ ] `SiteMap.tsx` uses real Leaflet
- [ ] External access integration created and attached
- [ ] Cortex Agent `TERRA_COPILOT` created in Snowsight
- [ ] Semantic model uploaded to stage
- [ ] ML result tables exist with sample data
- [ ] All referenced API methods exist in `snowflake_service_spcs.py`
- [ ] Ghost Cycle "hidden discovery" page exists
- [ ] Navigation context passed to all pages
- [ ] `npm run build` succeeds in frontend
- [ ] Docker build succeeds with no errors

---

## Recommended Fix Order

1. **Day 1 (Foundation)**
   - Fix naming consistency (TERRA → TERRA)
   - Add external access integration to DDL/deploy
   - Add missing ML tables to DDL
   - Create Cortex Agent via Snowsight

2. **Day 2 (Frontend)**
   - Fix `SiteMap.tsx` to use real Leaflet
   - Wire up navigation context
   - Replace hardcoded data with API calls
   - Create Ghost Cycle showcase page

3. **Day 3 (Polish)**
   - Add missing service methods
   - Test end-to-end flow
   - Customize Architecture page
   - Test deployment to SPCS

---

## Files to Modify

| Priority | File | Changes |
|----------|------|---------|
| 🔴 | `ddl/001_database.sql` | Rename TERRA → TERRA, add network rules |
| 🔴 | `deploy/deploy.sh` | Rename, add semantic model upload, add external access |
| 🔴 | `frontend/src/pages/SiteMap.tsx` | Replace SVG with Leaflet |
| 🔴 | `cortex/deploy_agent.sql` | Create new file |
| 🟡 | `frontend/src/App.tsx` | Add NavigationContext, add Ghost page |
| 🟡 | `frontend/src/pages/GhostCycleAnalysis.tsx` | Create new file |
| 🟡 | `backend/services/snowflake_service_spcs.py` | Add missing methods |
| 🟡 | `ddl/005_ml_schema.sql` | Add ML result tables |
| 🟢 | `frontend/src/pages/Architecture.tsx` | Customize for TERRA |
| 🟢 | `frontend/index.html` | Add Leaflet CSS CDN |

---

*This analysis was conducted by comparing against the production-ready Capital Delivery (ATLAS) demo which successfully runs in SPCS with full Cortex Agent integration.*
