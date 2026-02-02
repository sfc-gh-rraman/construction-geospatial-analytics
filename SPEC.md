# Demo Requirements Document (DRD): Geospatial Analytics for Construction & Equipment
**Slug:** `@geospatial_construction_drd`
**Dependencies:** None

## 1. Strategic Overview
**Slug:** `@strategic_overview`
**Dependencies:** None

*   **Problem Statement:** Construction sites are chaotic, dynamic environments where equipment efficiency is lost to poor logistics. Telematics data tells you *where* a truck is, but not *what* it's doing in context of the changing terrain. This disconnect leads to "Ghost Cycles"—equipment burning fuel while waiting or taking inefficient routes—costing millions in lost productivity.
*   **Target Business Goals (KPIs):**
    *   **Utilization:** Increase effective equipment uptime by 20%.
    *   **Cost:** Reduce fuel burn by 15% via route optimization.
    *   **Safety:** Eliminate 100% of vehicle-pedestrian near-misses in geofenced zones.
*   **The "Wow" Moment:** A Site Superintendent sees a "Choke Point Alert" on the haul road map. Cortex overlays GPS tracks with Engine Load data, revealing that trucks are idling for 12 minutes at a specific intersection due to a newly placed stockpile. The system suggests a 50-meter route deviation to clear the bottleneck.
*   **Hidden Discovery:**
    *   **Discovery Statement:** "A 'Ghost Cycle' pattern (equipment moving but not hauling) is detected by correlating GPS breadcrumbs with engine load telematics, revealing a specific site layout inefficiency causing 20% fuel waste."
    *   **Surface Appearance:** Trucks are "Active" and moving; cycle times look acceptable.
    *   **Revealed Reality:** Engine load drops to idle levels during transit, indicating trucks are coasting/waiting rather than hauling payload.
    *   **Business Impact:** Redesigning the haul road saves $50k/month in fuel and improves cycle count by 15%.

## 2. User Personas & Stories
**Slug:** `@user_personas_stories`
**Dependencies:** [`@strategic_overview`]

| Persona Level | Role | User Story | Key Visuals |
| :--- | :--- | :--- | :--- |
| **Strategic** | **VP of Operations** | "As a VP, I want to see the 'Cost per Cubic Yard' moved across all sites to benchmark project performance." | Multi-Site Efficiency Map, Cost/Volume Trend, Fleet Utilization Heatmap. |
| **Operational** | **Site Superintendent** | "As a Super, I want to know exactly where my bottlenecks are right now so I can redeploy dozers to clear them." | Live Site Map (Drone Overlay), Cycle Time Distribution, "Choke Point" Alerts. |
| **Technical** | **GIS Analyst** | "As an Analyst, I want to automate the cut/fill volume calculation by ingesting daily drone surveys." | Volume Delta Heatmap (Yesterday vs Today), Elevation Profile, Earthwork Progress. |

## 3. Data Architecture
**Slug:** `@data_architecture`
**Dependencies:** [`@user_personas_stories`]

### 3.1 Schema Structure
**Slug:** `@schema_structure`
**Dependencies:** [`@data_architecture`]
All data resides in `CONSTRUCTION_GEO_DB` with the following schemas:

*   **`RAW`**: Landing zone for Telematics Stream, Drone Orthomosaics, and CAD Plans.
*   **`ATOMIC`**: Normalized Enterprise Data Model.
*   **`CONSTRUCTION_GEO`**: Data Mart for consumption.

### 3.2 RAW Layer
**Slug:** `@raw_layer`
**Dependencies:** [`@schema_structure`]
*   `RAW.EQUIPMENT_GPS`: High-frequency location ping (Lat/Lon/Elev).
*   `RAW.ENGINE_TELEMETRY`: CAN bus data (RPM, Fuel Rate, Load %).
*   `RAW.DRONE_SURVEY_TIFF`: Daily site elevation models.

### 3.3 ATOMIC Layer (Core & Extensions)
**Slug:** `@atomic_layer`
**Dependencies:** [`@raw_layer`]
*   **Core Entities** (Mapped from Data Dictionary):
    *   `ATOMIC.ASSET` (Yellow Iron):
        *   *Columns*: `ASSET_ID`, `ASSET_NAME`, `MODEL_YEAR`, `CAPACITY`.
    *   `ATOMIC.LOCATION` (Site/Zone):
        *   *Columns*: `LOCATION_ID`, `LOCATION_NAME`, `GEOMETRY` (Polygon), `ZONE_TYPE` (Cut, Fill, Haul).
    *   `ATOMIC.PROJECT`:
        *   *Columns*: `PROJECT_ID`, `PROJECT_NAME`, `START_DATE`, `BUDGET`.
*   **Extension Entities** (Project Specific):
    *   `ATOMIC.ASSET_ACTIVITY_LOG` (Extension):
        *   *Columns*: `ACTIVITY_ID`, `ASSET_ID`, `TIMESTAMP`, `ACTIVITY_STATE` (Hauling, Idling, Loading), `FUEL_BURN`.
    *   `ATOMIC.VOLUME_METRIC` (Extension):
        *   *Columns*: `METRIC_ID`, `LOCATION_ID`, `SURVEY_DATE`, `CUT_VOLUME`, `FILL_VOLUME`.

### 3.4 Data Mart Layer (`CONSTRUCTION_GEO`)
**Slug:** `@data_mart_layer`
**Dependencies:** [`@atomic_layer`]
*   `CONSTRUCTION_GEO.HAUL_ROAD_EFFICIENCY` (View): Spatial analysis of cycle times.
*   `CONSTRUCTION_GEO.FLEET_UTILIZATION` (Table): Aggregated uptime metrics.
*   `CONSTRUCTION_GEO.SITE_PROGRESS` (View): Cut/Fill vs. Design Plan.

## 4. Cortex Intelligence Specifications
**Slug:** `@cortex_intelligence`
**Dependencies:** [`@data_mart_layer`]

### 4.1 Cortex Analyst (Structured)
**Slug:** `@cortex_analyst`
**Dependencies:** [`@cortex_intelligence`]
*   **Semantic Model Scope**:
    *   **Measures**: `Total_Volume_Moved`, `Avg_Cycle_Time`, `Fuel_Efficiency_Gal_Hr`, `Idle_Cost`.
    *   **Dimensions**: `Equipment_Type`, `Operator`, `Shift`, `Material_Type`.
*   **Golden Query**: "Show me the average cycle time for CAT 793 trucks on the 'North Haul Road' yesterday."

### 4.2 Cortex Search (Unstructured)
**Slug:** `@cortex_search`
**Dependencies:** [`@cortex_analyst`]
*   **Service Name**: `SITE_DOCS_SEARCH`
*   **Source Data**: Geotechnical Reports, Safety Plans, Equipment Manuals.
*   **Indexing Strategy**: Index by `Site_ID` and `Doc_Type`.
*   **Sample Prompt**: "What is the maximum safe grade for a loaded Articulated Dump Truck on wet clay?"

## 5. Streamlit Application UX/UI
**Slug:** `@streamlit_app`
**Dependencies:** [`@cortex_search`]

### Page 1: Regional Command (Strategic)
**Slug:** `@page_regional_command`
**Dependencies:** [`@streamlit_app`]
*   **Situation**: "Project Alpha is behind schedule."
*   **Visuals**:
    *   **Mapbox Cluster**: Sites colored by "Schedule Variance".
    *   **KPI Strip**: "Volume Moved vs. Plan", "Fleet Availability".

### Page 2: Site Operations (Operational)
**Slug:** `@page_site_operations`
**Dependencies:** [`@page_regional_command`]
*   **Task**: "Resolve the haul road bottleneck."
*   **Visuals**:
    *   **Live Traffic Map**: Moving dots on Drone Orthomosaic. Red segments = Slow Traffic.
    *   **Cycle Time Histogram**: Bimodal distribution indicating "Stuck" trucks.
    *   **Action**: "Redeploy Motor Grader to Sector 4".

### Page 3: Earthwork Analytics (Technical)
**Slug:** `@page_earthwork_analytics`
**Dependencies:** [`@page_site_operations`]
*   **Action**: "Verify yesterday's cut volume."
*   **Visuals**:
    *   **Diff Map**: Heatmap of elevation change (Red = Cut, Green = Fill).
    *   **Cross Section**: Design Surface vs. Actual Surface.
    *   **Hidden Discovery**: "Ghost Cycle" Detection chart.

## 6. Success Criteria
**Slug:** `@success_criteria`
**Dependencies:** [`@page_earthwork_analytics`]

*   **Technical**:
    *   Ingest and spatially join 50k GPS points with site polygons in < 1 minute.
    *   Calculate daily volume change from 1GB GeoTIFF in < 5 mins.
*   **Business**:
    *   Identify site bottlenecks to improve daily volume moved by 10%.
    *   Reduce idle fuel burn by 15% ($200k/project).
