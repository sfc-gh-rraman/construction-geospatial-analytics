# TERRA Geospatial Analytics - Fix Plan for Junior Developer

**Priority:** Complete in order - each step builds on previous  
**Reference:** Compare against `/Users/rraman/Documents/construction_demos/construction/construction_capital_delivery/` (ATLAS) for patterns  
**Estimated Time:** 2-3 days

---

## PHASE 1: Foundation (Day 1)

### Task 1.1: Global Naming Cleanup
**Time:** 30 minutes

1. Run find/replace across ALL files in the project:
   ```
   TERRA → TERRA
   terra → terra
   Terra → Terra
   ```

2. Specific files that MUST be updated:
   - `ddl/001_database.sql` - Comment header
   - `deploy/deploy.sh` - Variables `REPO_NAME`, `IMAGE_NAME`, `SERVICE_NAME`, etc.
   - `deploy/Dockerfile` - Comments and echo statements
   - `deploy/DEPLOYMENT_GUIDE.md` - All references

3. **Verify:** `grep -r "TERRA" .` returns nothing

---

### Task 1.2: Add External Access Integration for Map Tiles
**Time:** 20 minutes

1. Create new file `ddl/006_network_access.sql`:

```sql
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
```

2. Update `deploy/deploy.sh` - In the `CREATE SERVICE` command, add:
```bash
EXTERNAL_ACCESS_INTEGRATIONS = (TERRA_MAP_TILES_ACCESS)
```
   - Find the service spec section (around line 109-134)
   - Add the line after `MIN_INSTANCES = 1`

---

### Task 1.3: Add Missing ML Result Tables
**Time:** 30 minutes

1. Update `ddl/005_ml_schema.sql` - Add these tables:

```sql
-- Ghost Cycle Predictions (from ML model)
CREATE TABLE IF NOT EXISTS ML.GHOST_CYCLE_PREDICTIONS (
    PREDICTION_ID VARCHAR(36) PRIMARY KEY,
    EQUIPMENT_ID VARCHAR(20),
    SITE_ID VARCHAR(20),
    TIMESTAMP TIMESTAMP_NTZ,
    IS_GHOST_CYCLE BOOLEAN,
    CONFIDENCE FLOAT,
    SPEED_MPH FLOAT,
    ENGINE_LOAD_PCT FLOAT,
    ESTIMATED_FUEL_WASTE_GAL FLOAT,
    LATITUDE FLOAT,
    LONGITUDE FLOAT,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Choke Point Predictions
CREATE TABLE IF NOT EXISTS ML.CHOKE_POINT_PREDICTIONS (
    PREDICTION_ID VARCHAR(36) PRIMARY KEY,
    SITE_ID VARCHAR(20),
    ZONE_NAME VARCHAR(100),
    ZONE_LAT FLOAT,
    ZONE_LNG FLOAT,
    CHOKE_PROBABILITY FLOAT,
    PREDICTED_SEVERITY VARCHAR(20),
    PREDICTED_WAIT_TIME_MIN FLOAT,
    PREDICTED_ONSET_TIME TIMESTAMP_NTZ,
    RECOMMENDED_ACTION VARCHAR(500),
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Optimal Cycle Parameters
CREATE TABLE IF NOT EXISTS CONSTRUCTION_GEO.OPTIMAL_CYCLE_PARAMS (
    PARAM_ID VARCHAR(36) PRIMARY KEY,
    SITE_ID VARCHAR(20),
    HOUR_OF_DAY INT,
    OPTIMAL_VOLUME FLOAT,
    OPTIMAL_DISTANCE FLOAT,
    ACHIEVED_CYCLE_TIME FLOAT,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Model Feature Importance (SHAP values)
CREATE TABLE IF NOT EXISTS ML.GLOBAL_FEATURE_IMPORTANCE (
    IMPORTANCE_ID VARCHAR(36) PRIMARY KEY,
    MODEL_NAME VARCHAR(100),
    FEATURE_NAME VARCHAR(100),
    SHAP_IMPORTANCE FLOAT,
    IMPORTANCE_RANK INT,
    FEATURE_DIRECTION VARCHAR(20),
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Model Metrics
CREATE TABLE IF NOT EXISTS ML.MODEL_METRICS (
    METRIC_ID VARCHAR(36) PRIMARY KEY,
    MODEL_NAME VARCHAR(100),
    METRIC_NAME VARCHAR(100),
    METRIC_VALUE FLOAT,
    METRIC_CONTEXT VARCHAR(500),
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Calibration Curves
CREATE TABLE IF NOT EXISTS ML.CALIBRATION_CURVES (
    CURVE_ID VARCHAR(36) PRIMARY KEY,
    MODEL_NAME VARCHAR(100),
    PREDICTED_PROB_BIN FLOAT,
    ACTUAL_FREQUENCY FLOAT,
    BIN_COUNT INT,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Partial Dependence Curves
CREATE TABLE IF NOT EXISTS ML.PARTIAL_DEPENDENCE_CURVES (
    CURVE_ID VARCHAR(36) PRIMARY KEY,
    MODEL_NAME VARCHAR(100),
    FEATURE_NAME VARCHAR(100),
    FEATURE_VALUE FLOAT,
    PREDICTED_VALUE FLOAT,
    LOWER_BOUND FLOAT,
    UPPER_BOUND FLOAT,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
```

---

### Task 1.4: Add Semantic Model Stage to Deploy Script
**Time:** 15 minutes

1. Update `deploy/deploy.sh` - Add new function after `get_repo_url()`:

```bash
# Upload semantic model
upload_semantic_model() {
    log_info "Creating semantic model stage..."
    snow sql -q "CREATE STAGE IF NOT EXISTS ${DATABASE}.${SCHEMA}.SEMANTIC_MODELS 
        DIRECTORY = (ENABLE = TRUE);"
    
    log_info "Uploading semantic model..."
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    snow sql -q "PUT file://${SCRIPT_DIR}/../cortex/construction_semantic_model.yaml 
        @${DATABASE}.${SCHEMA}.SEMANTIC_MODELS 
        OVERWRITE = TRUE 
        AUTO_COMPRESS = FALSE;"
    
    log_info "Semantic model uploaded!"
}
```

2. Call it in the `all)` case:
```bash
all)
    build
    push
    upload_semantic_model  # Add this line
    deploy
    ;;
```

---

### Task 1.5: Create Cortex Agent Deployment Guide
**Time:** 10 minutes

1. Create `cortex/DEPLOY_AGENT.md`:

```markdown
# TERRA Cortex Agent Deployment

## Step 1: Ensure Semantic Model is Uploaded
Run: `snow sql -q "LIST @CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SEMANTIC_MODELS"`

Should show: `construction_semantic_model.yaml`

## Step 2: Create Agent in Snowsight

1. Go to Snowsight → AI & ML → Cortex Agents
2. Click "Create Agent"
3. Configure:
   - **Name:** `TERRA_COPILOT`
   - **Database:** `CONSTRUCTION_GEO_DB`
   - **Schema:** `CONSTRUCTION_GEO`

4. System Instructions:
```
You are TERRA (Terrain & Equipment Route Resource Advisor), an AI assistant 
for construction site geospatial analytics.

You help users with:
- Equipment tracking and fleet status
- Ghost Cycle detection (equipment moving but not hauling)
- Haul road choke point analysis
- Earthwork volume progress
- Cycle time optimization

When answering questions about data, use the Analyst tool to query the database.
When searching for documents, use the Search tool.

Always be specific with numbers and provide actionable insights.
```

5. Add Tools:
   - **Analyst:** Select `construction_semantic_model.yaml`
   - **Search:** Select `SITE_DOCUMENTS_SEARCH`

6. Click "Create"

## Step 3: Verify
Test in Snowsight chat: "How many equipment units do we have?"
```

---

## PHASE 2: Frontend Fixes (Day 2)

### Task 2.1: Fix SiteMap.tsx - Replace Fake Map with Real Leaflet
**Time:** 1 hour

1. Open `frontend/src/pages/SiteMap.tsx`

2. Replace the ENTIRE file with this implementation (model after `RegionalOverview.tsx`):

```tsx
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { MapPin, Truck, AlertTriangle, Navigation, ArrowLeft } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface Equipment {
  id: string
  name: string
  type: 'haul_truck' | 'excavator' | 'loader' | 'dozer'
  lat: number
  lng: number
  status: 'working' | 'idle' | 'ghost_cycle'
  speed: number
  engineLoad: number
  heading: number
}

interface ChokePoint {
  id: string
  name: string
  lat: number
  lng: number
  severity: 'high' | 'medium' | 'low'
  waitTime: number
  equipmentCount: number
}

// Component to fit bounds
function FitBounds({ equipment }: { equipment: Equipment[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (equipment.length > 0) {
      const bounds = equipment.map(e => [e.lat, e.lng] as [number, number])
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [equipment, map])
  
  return null
}

export function SiteMap() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [chokePoints, setChokePoints] = useState<ChokePoint[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch from API - for now use fallback data
      // const res = await fetch('/api/site/alpha/equipment')
      // const data = await res.json()
      
      // Fallback data with real Phoenix coordinates
      setEquipment([
        { id: 'H-01', name: 'CAT 793 #1', type: 'haul_truck', lat: 33.4520, lng: -112.0840, status: 'working', speed: 18, engineLoad: 75, heading: 45 },
        { id: 'H-02', name: 'CAT 793 #2', type: 'haul_truck', lat: 33.4515, lng: -112.0825, status: 'ghost_cycle', speed: 3, engineLoad: 18, heading: 180 },
        { id: 'H-03', name: 'CAT 793 #3', type: 'haul_truck', lat: 33.4508, lng: -112.0850, status: 'working', speed: 22, engineLoad: 82, heading: 270 },
        { id: 'H-04', name: 'CAT 793 #4', type: 'haul_truck', lat: 33.4525, lng: -112.0815, status: 'idle', speed: 0, engineLoad: 12, heading: 90 },
        { id: 'E-01', name: 'CAT D10 #1', type: 'excavator', lat: 33.4512, lng: -112.0835, status: 'working', speed: 0, engineLoad: 65, heading: 0 },
        { id: 'L-01', name: 'CAT 992 #1', type: 'loader', lat: 33.4518, lng: -112.0830, status: 'working', speed: 5, engineLoad: 70, heading: 135 },
      ])
      
      setChokePoints([
        { id: 'cp-1', name: 'Stockpile B Intersection', lat: 33.4522, lng: -112.0820, severity: 'high', waitTime: 12, equipmentCount: 4 },
        { id: 'cp-2', name: 'North Road Bend', lat: 33.4530, lng: -112.0845, severity: 'medium', waitTime: 5, equipmentCount: 2 },
      ])
    } catch (error) {
      console.error('Failed to fetch equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return '#22c55e'
      case 'idle': return '#64748b'
      case 'ghost_cycle': return '#f97316'
      default: return '#64748b'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#22c55e'
      default: return '#64748b'
    }
  }

  const ghostCycleCount = equipment.filter(e => e.status === 'ghost_cycle').length

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-terra-amber border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: '500px' }}>
        {/* Stats overlay */}
        <div className="absolute top-4 left-4 z-[1000] flex gap-3">
          <div className="card px-4 py-2 flex items-center gap-2">
            <Truck size={18} className="text-terra-amber" />
            <span className="text-lg font-bold text-white">{equipment.length}</span>
            <span className="text-sm text-slate-400">Equipment</span>
          </div>
          {ghostCycleCount > 0 && (
            <div className="card px-4 py-2 flex items-center gap-2 border-orange-500/50">
              <AlertTriangle size={18} className="text-orange-400" />
              <span className="text-lg font-bold text-orange-400">{ghostCycleCount}</span>
              <span className="text-sm text-slate-400">Ghost Cycles</span>
            </div>
          )}
        </div>

        <MapContainer
          center={[33.4515, -112.0832]}
          zoom={16}
          className="absolute inset-0"
          style={{ background: '#0d1117', height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
          />
          <FitBounds equipment={equipment} />

          {/* Choke Points */}
          {chokePoints.map(cp => (
            <CircleMarker
              key={cp.id}
              center={[cp.lat, cp.lng]}
              radius={20}
              pathOptions={{
                color: getSeverityColor(cp.severity),
                fillColor: getSeverityColor(cp.severity),
                fillOpacity: 0.3,
                weight: 2,
                dashArray: '5, 5'
              }}
            >
              <Popup>
                <div className="p-2">
                  <div className="font-bold text-white">{cp.name}</div>
                  <div className="text-sm text-red-400">⚠️ Choke Point - {cp.severity}</div>
                  <div className="text-sm text-slate-400">Wait time: {cp.waitTime} min</div>
                  <div className="text-sm text-slate-400">{cp.equipmentCount} trucks waiting</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Equipment */}
          {equipment.map(eq => (
            <CircleMarker
              key={eq.id}
              center={[eq.lat, eq.lng]}
              radius={eq.status === 'ghost_cycle' ? 10 : 8}
              pathOptions={{
                color: getStatusColor(eq.status),
                fillColor: getStatusColor(eq.status),
                fillOpacity: 0.8,
                weight: eq.status === 'ghost_cycle' ? 3 : 2
              }}
              eventHandlers={{
                click: () => setSelectedEquipment(eq)
              }}
            >
              <Popup>
                <div className="p-2 min-w-[180px]">
                  <div className="font-bold text-white">{eq.name}</div>
                  <div className="text-xs text-slate-400 mb-2">{eq.id}</div>
                  
                  <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${
                    eq.status === 'ghost_cycle' ? 'bg-orange-500/20 text-orange-400' :
                    eq.status === 'working' ? 'bg-green-500/20 text-green-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {eq.status === 'ghost_cycle' ? '⚠️ GHOST CYCLE' : eq.status.toUpperCase()}
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Speed:</span>
                      <span className="text-white">{eq.speed} mph</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Engine Load:</span>
                      <span className={eq.engineLoad < 30 ? 'text-orange-400' : 'text-white'}>
                        {eq.engineLoad}%
                      </span>
                    </div>
                  </div>
                  
                  {eq.status === 'ghost_cycle' && (
                    <div className="mt-2 p-2 bg-orange-500/10 rounded text-xs text-orange-300">
                      Moving ({eq.speed} mph) but low engine load ({eq.engineLoad}%) = wasting fuel
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] card p-3">
          <div className="text-xs font-medium text-slate-400 mb-2">Status</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-slate-300">Working</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-500" />
              <span className="text-xs text-slate-300">Idle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs text-slate-300">Ghost Cycle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-dashed border-red-500" />
              <span className="text-xs text-slate-300">Choke Point</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l border-navy-700 bg-navy-900/50 overflow-y-auto p-4">
        {selectedEquipment ? (
          <div>
            <button
              onClick={() => setSelectedEquipment(null)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
            >
              <ArrowLeft size={16} /> Back to list
            </button>
            
            <div className="card p-4">
              <h3 className="font-bold text-white text-lg">{selectedEquipment.name}</h3>
              <p className="text-sm text-slate-500 mb-4">{selectedEquipment.id}</p>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className={
                    selectedEquipment.status === 'ghost_cycle' ? 'text-orange-400' :
                    selectedEquipment.status === 'working' ? 'text-green-400' :
                    'text-slate-400'
                  }>
                    {selectedEquipment.status === 'ghost_cycle' ? 'Ghost Cycle ⚠️' : selectedEquipment.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Speed</span>
                  <span className="text-white">{selectedEquipment.speed} mph</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Engine Load</span>
                  <span className="text-white">{selectedEquipment.engineLoad}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Heading</span>
                  <span className="text-white flex items-center gap-1">
                    <Navigation size={14} style={{ transform: `rotate(${selectedEquipment.heading}deg)` }} />
                    {selectedEquipment.heading}°
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="font-medium text-slate-200 mb-4">Equipment List</h3>
            <div className="space-y-2">
              {equipment.map(eq => (
                <button
                  key={eq.id}
                  onClick={() => setSelectedEquipment(eq)}
                  className={`w-full card p-3 text-left hover:border-terra-amber/30 transition ${
                    eq.status === 'ghost_cycle' ? 'border-orange-500/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-200">{eq.name}</div>
                      <div className="text-xs text-slate-500">{eq.id}</div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      eq.status === 'ghost_cycle' ? 'bg-orange-500 animate-pulse' :
                      eq.status === 'working' ? 'bg-green-500' :
                      'bg-slate-500'
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

3. **Verify:** Run `npm run dev` and navigate to Site Map - should show real Leaflet map

---

### Task 2.2: Create Ghost Cycle Analysis Page (The "Wow" Page)
**Time:** 1.5 hours

1. Create new file `frontend/src/pages/GhostCycleAnalysis.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { AlertTriangle, Truck, DollarSign, TrendingUp, Zap, Clock, MapPin } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface GhostCyclePattern {
  totalGhostCycles: number
  totalFuelWasted: number
  estimatedMonthlyCost: number
  affectedEquipment: number
  affectedSites: number
  topOffenders: {
    equipmentId: string
    equipmentName: string
    ghostCount: number
    fuelWasted: number
    siteName: string
  }[]
  bySite: {
    siteName: string
    ghostCount: number
    fuelWasted: number
  }[]
  byHour: {
    hour: number
    ghostCount: number
  }[]
}

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5']

export function GhostCycleAnalysis() {
  const [data, setData] = useState<GhostCyclePattern | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGhostCycleData()
  }, [])

  const fetchGhostCycleData = async () => {
    try {
      const res = await fetch('/api/ml/hidden-pattern-analysis')
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch ghost cycle data:', error)
      // Fallback data for demo
      setData({
        totalGhostCycles: 156,
        totalFuelWasted: 1240,
        estimatedMonthlyCost: 47120,
        affectedEquipment: 23,
        affectedSites: 4,
        topOffenders: [
          { equipmentId: 'H-07', equipmentName: 'CAT 793 #7', ghostCount: 28, fuelWasted: 224, siteName: 'Project Alpha' },
          { equipmentId: 'H-12', equipmentName: 'CAT 793 #12', ghostCount: 24, fuelWasted: 192, siteName: 'Project Beta' },
          { equipmentId: 'H-03', equipmentName: 'CAT 793 #3', ghostCount: 21, fuelWasted: 168, siteName: 'Project Alpha' },
          { equipmentId: 'H-19', equipmentName: 'CAT 793 #19', ghostCount: 18, fuelWasted: 144, siteName: 'Project Gamma' },
          { equipmentId: 'H-08', equipmentName: 'CAT 793 #8', ghostCount: 15, fuelWasted: 120, siteName: 'Project Delta' },
        ],
        bySite: [
          { siteName: 'Project Alpha', ghostCount: 58, fuelWasted: 464 },
          { siteName: 'Project Beta', ghostCount: 42, fuelWasted: 336 },
          { siteName: 'Project Gamma', ghostCount: 31, fuelWasted: 248 },
          { siteName: 'Project Delta', ghostCount: 25, fuelWasted: 192 },
        ],
        byHour: [
          { hour: 6, ghostCount: 12 },
          { hour: 7, ghostCount: 8 },
          { hour: 8, ghostCount: 15 },
          { hour: 9, ghostCount: 22 },
          { hour: 10, ghostCount: 18 },
          { hour: 11, ghostCount: 25 },
          { hour: 12, ghostCount: 28 },
          { hour: 13, ghostCount: 14 },
          { hour: 14, ghostCount: 8 },
          { hour: 15, ghostCount: 6 },
        ],
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 animated-grid-bg min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
          <AlertTriangle className="text-orange-400" />
          Ghost Cycle Detection
        </h1>
        <p className="text-slate-400">Hidden Discovery: Equipment moving but not hauling = wasted fuel</p>
      </div>

      {/* Big Reveal Banner */}
      <div className="card mb-6 p-6 border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-transparent">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <Zap size={32} className="text-orange-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-orange-400 mb-2">
              🔍 Hidden Discovery: {data.totalGhostCycles} Ghost Cycles Detected
            </h2>
            <p className="text-slate-300 mb-4">
              TERRA identified equipment that appears "active" (GPS shows movement) but is actually 
              wasting fuel (engine load &lt; 30%). These trucks are moving but <strong>not hauling payload</strong>.
            </p>
            <div className="flex items-center gap-8">
              <div>
                <span className="text-3xl font-bold text-orange-400">{data.totalFuelWasted.toLocaleString()}</span>
                <span className="text-slate-400 ml-2">gallons wasted this month</span>
              </div>
              <div>
                <span className="text-3xl font-bold text-red-400">${data.estimatedMonthlyCost.toLocaleString()}</span>
                <span className="text-slate-400 ml-2">estimated monthly cost</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <AlertTriangle size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Ghost Cycles</p>
              <p className="text-2xl font-bold text-orange-400">{data.totalGhostCycles}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <DollarSign size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Monthly Cost</p>
              <p className="text-2xl font-bold text-red-400">${(data.estimatedMonthlyCost / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Truck size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Affected Units</p>
              <p className="text-2xl font-bold text-amber-400">{data.affectedEquipment}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <MapPin size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Sites Affected</p>
              <p className="text-2xl font-bold text-purple-400">{data.affectedSites}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Fuel Wasted</p>
              <p className="text-2xl font-bold text-cyan-400">{data.totalFuelWasted.toLocaleString()} gal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* By Hour Chart */}
        <div className="col-span-8">
          <div className="card p-4">
            <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-orange-400" />
              Ghost Cycles by Hour of Day
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#94a3b8" 
                    tickFormatter={(h) => `${h}:00`}
                  />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [value, 'Ghost Cycles']}
                    labelFormatter={(h) => `Hour: ${h}:00`}
                  />
                  <Bar dataKey="ghostCount" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-sm text-orange-300">
                <strong>Insight:</strong> Peak Ghost Cycles occur at 11:00-12:00 (lunch transitions) and 9:00-10:00 (shift handovers). 
                Consider optimizing shift scheduling to reduce idle movement.
              </p>
            </div>
          </div>
        </div>

        {/* By Site Pie */}
        <div className="col-span-4">
          <div className="card p-4">
            <h3 className="text-lg font-medium text-slate-200 mb-4">Distribution by Site</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.bySite}
                    dataKey="ghostCount"
                    nameKey="siteName"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ siteName, percent }) => `${siteName.split(' ')[1]} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.bySite.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Offenders */}
        <div className="col-span-12">
          <div className="card p-4">
            <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
              <Truck size={18} className="text-orange-400" />
              Top Ghost Cycle Offenders
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="text-left py-3 px-4 text-sm text-slate-400">Equipment</th>
                    <th className="text-left py-3 px-4 text-sm text-slate-400">Site</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400">Ghost Cycles</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400">Fuel Wasted (gal)</th>
                    <th className="text-right py-3 px-4 text-sm text-slate-400">Est. Cost</th>
                    <th className="text-center py-3 px-4 text-sm text-slate-400">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topOffenders.map((eq, i) => (
                    <tr key={eq.equipmentId} className="border-b border-navy-700/50 hover:bg-navy-700/30">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{eq.equipmentName}</div>
                        <div className="text-xs text-slate-500">{eq.equipmentId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{eq.siteName}</td>
                      <td className="py-3 px-4 text-right font-mono text-orange-400">{eq.ghostCount}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-200">{eq.fuelWasted}</td>
                      <td className="py-3 px-4 text-right font-mono text-red-400">
                        ${(eq.fuelWasted * 3.8).toFixed(0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          i === 0 ? 'bg-red-500/20 text-red-400' :
                          i < 3 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {i === 0 ? 'Critical' : i < 3 ? 'High' : 'Medium'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card mt-6 p-6">
        <h3 className="text-lg font-medium text-slate-200 mb-4">AI Recommendations</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-navy-700/50 rounded-lg">
            <div className="text-orange-400 font-medium mb-2">1. Route Optimization</div>
            <p className="text-sm text-slate-400">
              Redesign haul road layout at Project Alpha to eliminate unnecessary equipment movement near Stockpile B.
            </p>
          </div>
          <div className="p-4 bg-navy-700/50 rounded-lg">
            <div className="text-orange-400 font-medium mb-2">2. Shift Scheduling</div>
            <p className="text-sm text-slate-400">
              Stagger lunch breaks to reduce 11:00-12:00 congestion that causes trucks to idle while moving.
            </p>
          </div>
          <div className="p-4 bg-navy-700/50 rounded-lg">
            <div className="text-orange-400 font-medium mb-2">3. Driver Training</div>
            <p className="text-sm text-slate-400">
              Focus training on H-07 and H-12 operators who show highest ghost cycle frequency.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

2. Update `frontend/src/pages/index.ts`:
```tsx
export { GhostCycleAnalysis } from './GhostCycleAnalysis'
```

3. Update `frontend/src/App.tsx`:
```tsx
// Add to imports:
import { GhostCycleAnalysis } from './pages'

// Add to Page type:
export type Page = 'landing' | 'regional' | 'siteops' | 'equipment' | 'earthwork' | 'ghost' | 'brief' | 'docs' | 'architecture'

// Add to renderPage switch:
case 'ghost':
  return <GhostCycleAnalysis />
```

4. Update `frontend/src/components/Layout.tsx` to add navigation link for Ghost Cycles

---

### Task 2.3: Wire Up Navigation Context
**Time:** 30 minutes

1. Update `frontend/src/App.tsx`:

```tsx
import { useState } from 'react'
import { Layout } from './components/Layout'
import { 
  Landing,
  RegionalOverview,
  SiteCommand,
  SiteMap,
  EarthworkProgress,
  GhostCycleAnalysis,
  DailyBriefing,
  DocumentSearch,
  Architecture
} from './pages'

export type Page = 'landing' | 'regional' | 'siteops' | 'equipment' | 'earthwork' | 'ghost' | 'brief' | 'docs' | 'architecture'

export interface NavigationContext {
  onNavigate: (page: Page) => void
  selectedSiteId: string | null
  setSelectedSiteId: (id: string | null) => void
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing')
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)

  const navContext: NavigationContext = {
    onNavigate: setCurrentPage,
    selectedSiteId,
    setSelectedSiteId
  }

  if (currentPage === 'landing') {
    return <Landing onNavigate={setCurrentPage} />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'regional':
        return <RegionalOverview {...navContext} />
      case 'siteops':
        return <SiteCommand {...navContext} />
      case 'equipment':
        return <SiteMap {...navContext} />
      case 'earthwork':
        return <EarthworkProgress {...navContext} />
      case 'ghost':
        return <GhostCycleAnalysis {...navContext} />
      case 'brief':
        return <DailyBriefing {...navContext} />
      case 'docs':
        return <DocumentSearch {...navContext} />
      case 'architecture':
        return <Architecture {...navContext} />
      default:
        return <RegionalOverview {...navContext} />
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  )
}

export default App
```

2. Update each page component to accept `NavigationContext` props (even if not used immediately)

---

## PHASE 3: Backend Fixes (Day 2-3)

### Task 3.1: Add Missing Methods to snowflake_service_spcs.py
**Time:** 45 minutes

Add these methods to `backend/services/snowflake_service_spcs.py`:

```python
def get_equipment_telemetry(self, site_id: str) -> List[Dict[str, Any]]:
    """Get latest equipment telemetry for a site."""
    sql = f"""
    SELECT 
        e.EQUIPMENT_ID,
        e.EQUIPMENT_NAME,
        e.EQUIPMENT_TYPE,
        t.TIMESTAMP,
        t.ENGINE_LOAD_PERCENT,
        t.FUEL_RATE_GPH,
        t.PAYLOAD_TONS,
        g.LATITUDE,
        g.LONGITUDE,
        g.SPEED_MPH,
        g.HEADING_DEGREES,
        CASE 
            WHEN g.SPEED_MPH > 2 AND t.ENGINE_LOAD_PERCENT < 30 THEN 'ghost_cycle'
            WHEN t.ENGINE_LOAD_PERCENT > 50 THEN 'working'
            ELSE 'idle'
        END as STATUS
    FROM {self.database}.RAW.EQUIPMENT e
    LEFT JOIN {self.database}.RAW.EQUIPMENT_TELEMATICS t 
        ON e.EQUIPMENT_ID = t.EQUIPMENT_ID
    LEFT JOIN {self.database}.RAW.GPS_BREADCRUMBS g 
        ON e.EQUIPMENT_ID = g.EQUIPMENT_ID
        AND ABS(DATEDIFF('second', g.TIMESTAMP, t.TIMESTAMP)) < 60
    WHERE e.SITE_ID = '{site_id}'
    QUALIFY ROW_NUMBER() OVER (PARTITION BY e.EQUIPMENT_ID ORDER BY t.TIMESTAMP DESC) = 1
    """
    return self.execute_query(sql)

def get_ghost_cycle_predictions(self, site_id: str) -> List[Dict[str, Any]]:
    """Get ghost cycle predictions for a site."""
    # First try ML table
    sql = f"""
    SELECT *
    FROM {self.database}.ML.GHOST_CYCLE_PREDICTIONS
    WHERE SITE_ID = '{site_id}'
      AND IS_GHOST_CYCLE = TRUE
      AND TIMESTAMP >= DATEADD(hour, -1, CURRENT_TIMESTAMP())
    ORDER BY CONFIDENCE DESC
    LIMIT 20
    """
    results = self.execute_query(sql)
    
    if not results:
        # Fallback to real-time detection
        return self.detect_ghost_cycles_realtime(site_id)
    
    return results

def detect_ghost_cycles_realtime(self, site_id: str) -> List[Dict[str, Any]]:
    """Real-time ghost cycle detection from raw data."""
    sql = f"""
    SELECT 
        g.EQUIPMENT_ID,
        e.EQUIPMENT_NAME,
        g.TIMESTAMP,
        g.LATITUDE,
        g.LONGITUDE,
        g.SPEED_MPH,
        t.ENGINE_LOAD_PERCENT,
        t.FUEL_RATE_GPH * 0.1 as ESTIMATED_FUEL_WASTE_GAL,
        TRUE as IS_GHOST_CYCLE
    FROM {self.database}.RAW.GPS_BREADCRUMBS g
    JOIN {self.database}.RAW.EQUIPMENT e ON g.EQUIPMENT_ID = e.EQUIPMENT_ID
    JOIN {self.database}.RAW.EQUIPMENT_TELEMATICS t 
        ON g.EQUIPMENT_ID = t.EQUIPMENT_ID
        AND ABS(DATEDIFF('second', g.TIMESTAMP, t.TIMESTAMP)) < 60
    WHERE e.SITE_ID = '{site_id}'
      AND g.SPEED_MPH > 2
      AND t.ENGINE_LOAD_PERCENT < 30
      AND g.TIMESTAMP >= DATEADD(hour, -1, CURRENT_TIMESTAMP())
    ORDER BY g.TIMESTAMP DESC
    LIMIT 50
    """
    return self.execute_query(sql)

def search_documents(self, query: str, limit: int = 5, document_type: str = None) -> List[Dict[str, Any]]:
    """Search documents using Cortex Search or fallback to LIKE."""
    type_filter = f"AND DOCUMENT_TYPE = '{document_type}'" if document_type else ""
    
    # Try Cortex Search first
    try:
        sql = f"""
        SELECT * FROM TABLE(
            SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
                'CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SITE_DOCUMENTS_SEARCH',
                '{query}',
                {{
                    'columns': ['TITLE', 'SUMMARY', 'DOCUMENT_TYPE', 'CONTENT'],
                    'limit': {limit}
                }}
            )
        )
        """
        return self.execute_query(sql)
    except:
        # Fallback to LIKE search
        sql = f"""
        SELECT 
            DOCUMENT_ID,
            TITLE,
            DOCUMENT_TYPE,
            SUMMARY,
            CONTENT,
            AUTHOR,
            DOCUMENT_DATE
        FROM {self.database}.RAW.SITE_DOCUMENTS
        WHERE (LOWER(TITLE) LIKE '%{query.lower()}%'
           OR LOWER(CONTENT) LIKE '%{query.lower()}%')
        {type_filter}
        LIMIT {limit}
        """
        return self.execute_query(sql)

def get_ml_hidden_pattern_analysis(self) -> Dict[str, Any]:
    """Get aggregated ghost cycle pattern for the 'wow' moment."""
    sql = f"""
    WITH ghost_summary AS (
        SELECT 
            COUNT(*) as total_ghost_cycles,
            COUNT(DISTINCT g.EQUIPMENT_ID) as affected_equipment,
            COUNT(DISTINCT e.SITE_ID) as affected_sites,
            SUM(t.FUEL_RATE_GPH * 0.1) as total_fuel_wasted
        FROM {self.database}.RAW.GPS_BREADCRUMBS g
        JOIN {self.database}.RAW.EQUIPMENT e ON g.EQUIPMENT_ID = e.EQUIPMENT_ID
        JOIN {self.database}.RAW.EQUIPMENT_TELEMATICS t 
            ON g.EQUIPMENT_ID = t.EQUIPMENT_ID
            AND ABS(DATEDIFF('second', g.TIMESTAMP, t.TIMESTAMP)) < 60
        WHERE g.SPEED_MPH > 2
          AND t.ENGINE_LOAD_PERCENT < 30
          AND g.TIMESTAMP >= DATEADD(day, -30, CURRENT_DATE())
    )
    SELECT * FROM ghost_summary
    """
    results = self.execute_query(sql)
    
    if results:
        r = results[0]
        return {
            "totalGhostCycles": r.get("TOTAL_GHOST_CYCLES", 156),
            "totalFuelWasted": r.get("TOTAL_FUEL_WASTED", 1240),
            "estimatedMonthlyCost": r.get("TOTAL_FUEL_WASTED", 1240) * 3.8,
            "affectedEquipment": r.get("AFFECTED_EQUIPMENT", 23),
            "affectedSites": r.get("AFFECTED_SITES", 4),
            # Add mock data for charts if needed
            "topOffenders": [],
            "bySite": [],
            "byHour": []
        }
    
    return {}
```

---

### Task 3.2: Add API Endpoint for Ghost Cycle Pattern
**Time:** 15 minutes

Add to `backend/api/main.py`:

```python
@app.get("/api/ml/hidden-pattern-analysis")
async def get_hidden_pattern_analysis():
    """Get the Ghost Cycle hidden pattern analysis - THE WOW MOMENT."""
    try:
        sf = get_snowflake_service()
        return sf.get_ml_hidden_pattern_analysis()
    except Exception as e:
        logger.error(f"Hidden pattern analysis error: {e}")
        # Return fallback for demo
        return {
            "totalGhostCycles": 156,
            "totalFuelWasted": 1240,
            "estimatedMonthlyCost": 47120,
            "affectedEquipment": 23,
            "affectedSites": 4,
            "topOffenders": [
                {"equipmentId": "H-07", "equipmentName": "CAT 793 #7", "ghostCount": 28, "fuelWasted": 224, "siteName": "Project Alpha"},
                {"equipmentId": "H-12", "equipmentName": "CAT 793 #12", "ghostCount": 24, "fuelWasted": 192, "siteName": "Project Beta"},
            ],
            "bySite": [
                {"siteName": "Project Alpha", "ghostCount": 58, "fuelWasted": 464},
                {"siteName": "Project Beta", "ghostCount": 42, "fuelWasted": 336},
            ],
            "byHour": [
                {"hour": h, "ghostCount": [12, 8, 15, 22, 18, 25, 28, 14, 8, 6][h-6]} 
                for h in range(6, 16)
            ]
        }
```

---

## PHASE 4: Final Verification (Day 3)

### Task 4.1: Local Testing Checklist
**Time:** 1 hour

Run these verifications:

```bash
# 1. Frontend builds
cd frontend
npm install
npm run build
# ✅ Should complete with no errors

# 2. Backend runs
cd ../backend
pip install -r requirements.txt
python -m uvicorn api.main:app --reload
# ✅ Should start on port 8000

# 3. Test key endpoints
curl http://localhost:8000/health
# ✅ {"status": "healthy"}

curl http://localhost:8000/api/ml/hidden-pattern-analysis
# ✅ Should return ghost cycle data

# 4. Docker build
cd ../deploy
docker build -t terra:latest -f Dockerfile ..
# ✅ Should build successfully
```

---

### Task 4.2: Pre-Deployment DDL Execution
**Time:** 30 minutes

Execute DDL files in order:

```bash
snow sql -c demo -f ddl/001_database.sql
snow sql -c demo -f ddl/002_raw_tables.sql
snow sql -c demo -f ddl/003_data_mart.sql
snow sql -c demo -f ddl/004_cortex_services.sql
snow sql -c demo -f ddl/005_ml_schema.sql
snow sql -c demo -f ddl/006_network_access.sql  # NEW
```

---

### Task 4.3: Deploy to SPCS
**Time:** 30 minutes

```bash
cd deploy
./deploy.sh all
```

Verify:
```bash
./deploy.sh status
```

---

## Summary Checklist

| Phase | Task | Status |
|-------|------|--------|
| 1.1 | Global naming cleanup | ⬜ |
| 1.2 | External access integration | ⬜ |
| 1.3 | ML tables in DDL | ⬜ |
| 1.4 | Semantic model stage | ⬜ |
| 1.5 | Cortex Agent guide | ⬜ |
| 2.1 | Fix SiteMap.tsx | ⬜ |
| 2.2 | Create GhostCycleAnalysis.tsx | ⬜ |
| 2.3 | Wire NavigationContext | ⬜ |
| 3.1 | Missing backend methods | ⬜ |
| 3.2 | Hidden pattern API | ⬜ |
| 4.1 | Local testing | ⬜ |
| 4.2 | Execute DDL | ⬜ |
| 4.3 | Deploy to SPCS | ⬜ |

---

## Questions? 

Refer to the ATLAS (Capital Delivery) demo at:
`/Users/rraman/Documents/construction_demos/construction/construction_capital_delivery/`

Especially:
- `copilot/frontend/src/pages/PortfolioMap.tsx` - Real Leaflet implementation
- `copilot/frontend/src/pages/ScopeForensics.tsx` - Hidden Discovery page pattern
- `copilot/deploy/deploy.sh` - External access integration pattern
