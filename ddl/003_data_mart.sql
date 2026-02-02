-- ============================================================================
-- GROUNDTRUTH Construction Geospatial Analytics - Data Mart (CONSTRUCTION_GEO)
-- ============================================================================
-- Analytical views and tables for the GROUNDTRUTH application

USE DATABASE CONSTRUCTION_GEO_DB;
USE SCHEMA CONSTRUCTION_GEO;

-- ============================================================================
-- GHOST_CYCLE_DETECTION - View for identifying Ghost Cycles
-- ============================================================================
-- A Ghost Cycle occurs when equipment appears active (GPS shows movement)
-- but engine load indicates it's not actually working (idling)
-- ============================================================================
CREATE OR REPLACE VIEW GHOST_CYCLE_DETECTION AS
WITH gps_with_telematics AS (
    SELECT 
        g.equipment_id,
        e.equipment_name,
        g.site_id,
        g.timestamp,
        g.latitude,
        g.longitude,
        g.speed_mph,
        t.engine_load_percent,
        t.fuel_rate_gph,
        -- Ghost Cycle flag: Moving (speed > 2) but low engine load (< 30%)
        CASE WHEN g.speed_mph > 2 AND t.engine_load_percent < 30 
             THEN TRUE ELSE FALSE END as is_ghost_cycle
    FROM RAW.GPS_BREADCRUMBS g
    LEFT JOIN RAW.EQUIPMENT_TELEMATICS t 
        ON g.equipment_id = t.equipment_id 
        AND g.timestamp = t.timestamp
    LEFT JOIN RAW.EQUIPMENT e ON g.equipment_id = e.equipment_id
),
ghost_periods AS (
    SELECT 
        equipment_id,
        equipment_name,
        site_id,
        MIN(timestamp) as period_start,
        MAX(timestamp) as period_end,
        COUNT(*) as point_count,
        AVG(speed_mph) as avg_speed,
        AVG(engine_load_percent) as avg_engine_load,
        SUM(fuel_rate_gph / 60) as fuel_consumed_gal, -- Convert hourly to per-minute
        AVG(latitude) as center_lat,
        AVG(longitude) as center_lng
    FROM gps_with_telematics
    WHERE is_ghost_cycle = TRUE
    GROUP BY 
        equipment_id, 
        equipment_name,
        site_id,
        TIME_SLICE(timestamp, 5, 'MINUTE')
    HAVING COUNT(*) >= 5  -- At least 5 minutes of ghost cycle
)
SELECT 
    *,
    DATEDIFF('minute', period_start, period_end) as duration_minutes,
    ROUND(fuel_consumed_gal * 5, 2) as estimated_fuel_waste_gal  -- Estimated at $5/gal
FROM ghost_periods;

-- ============================================================================
-- CHOKE_POINT_ANALYSIS - View for traffic bottleneck detection
-- ============================================================================
CREATE OR REPLACE VIEW CHOKE_POINT_ANALYSIS AS
WITH speed_by_zone AS (
    SELECT 
        site_id,
        ROUND(latitude, 4) as zone_lat,
        ROUND(longitude, 4) as zone_lng,
        DATE(timestamp) as analysis_date,
        AVG(speed_mph) as avg_speed_mph,
        MIN(speed_mph) as min_speed_mph,
        MAX(speed_mph) as max_speed_mph,
        COUNT(*) as sample_count,
        COUNT(DISTINCT equipment_id) as unique_equipment,
        -- Estimate wait time based on low speed
        SUM(CASE WHEN speed_mph < 3 THEN 1 ELSE 0 END) / 60.0 as wait_time_hours
    FROM RAW.GPS_BREADCRUMBS
    GROUP BY site_id, zone_lat, zone_lng, analysis_date
    HAVING COUNT(*) >= 100  -- Minimum traffic to consider
)
SELECT 
    *,
    CASE 
        WHEN avg_speed_mph < 5 AND unique_equipment > 10 THEN 'HIGH'
        WHEN avg_speed_mph < 8 AND unique_equipment > 5 THEN 'MEDIUM'
        ELSE 'LOW'
    END as severity,
    wait_time_hours * unique_equipment * 2.5 as estimated_fuel_waste_gal
FROM speed_by_zone
WHERE avg_speed_mph < 10;  -- Only slow zones

-- ============================================================================
-- DAILY_VOLUME_SUMMARY - Aggregated volume metrics
-- ============================================================================
CREATE OR REPLACE VIEW DAILY_VOLUME_SUMMARY AS
SELECT 
    site_id,
    survey_date,
    SUM(cut_volume_yd3) as total_cut_actual,
    SUM(fill_volume_yd3) as total_fill_actual,
    SUM(cut_plan_yd3) as total_cut_plan,
    SUM(fill_plan_yd3) as total_fill_plan,
    ROUND((SUM(cut_volume_yd3) / NULLIF(SUM(cut_plan_yd3), 0)) * 100, 1) as cut_progress_pct,
    ROUND((SUM(fill_volume_yd3) / NULLIF(SUM(fill_plan_yd3), 0)) * 100, 1) as fill_progress_pct,
    ROUND(
        ((SUM(cut_volume_yd3) + SUM(fill_volume_yd3)) / 
         NULLIF(SUM(cut_plan_yd3) + SUM(fill_plan_yd3), 0)) * 100, 
    1) as overall_progress_pct
FROM RAW.VOLUME_SURVEYS
GROUP BY site_id, survey_date;

-- ============================================================================
-- EQUIPMENT_EFFICIENCY - Equipment performance metrics
-- ============================================================================
CREATE OR REPLACE VIEW EQUIPMENT_EFFICIENCY AS
SELECT 
    e.equipment_id,
    e.equipment_name,
    e.equipment_type,
    e.site_id,
    COUNT(c.cycle_id) as total_cycles,
    AVG(c.cycle_time_minutes) as avg_cycle_time_min,
    SUM(c.load_volume_yd3) as total_volume_yd3,
    SUM(c.fuel_consumed_gal) as total_fuel_gal,
    ROUND(SUM(c.load_volume_yd3) / NULLIF(SUM(c.fuel_consumed_gal), 0), 2) as yd3_per_gal,
    AVG(t.engine_load_percent) as avg_engine_load,
    -- Calculate idle percentage
    SUM(CASE WHEN t.engine_load_percent < 20 THEN 1 ELSE 0 END) * 100.0 / 
        NULLIF(COUNT(t.telematics_id), 0) as idle_time_pct
FROM RAW.EQUIPMENT e
LEFT JOIN RAW.CYCLE_EVENTS c ON e.equipment_id = c.equipment_id
LEFT JOIN RAW.EQUIPMENT_TELEMATICS t ON e.equipment_id = t.equipment_id
GROUP BY e.equipment_id, e.equipment_name, e.equipment_type, e.site_id;

-- ============================================================================
-- ROUTE_SEGMENT_EFFICIENCY - Haul road segment analysis
-- ============================================================================
CREATE OR REPLACE VIEW ROUTE_SEGMENT_EFFICIENCY AS
WITH segments AS (
    SELECT 
        site_id,
        -- Create segments by rounding to grid
        ROUND(latitude, 3) as segment_lat,
        ROUND(longitude, 3) as segment_lng,
        AVG(speed_mph) as avg_speed,
        STDDEV(speed_mph) as speed_variance,
        COUNT(*) as traffic_volume,
        COUNT(DISTINCT equipment_id) as unique_equipment
    FROM RAW.GPS_BREADCRUMBS
    WHERE timestamp >= DATEADD(day, -7, CURRENT_TIMESTAMP())
    GROUP BY site_id, segment_lat, segment_lng
    HAVING COUNT(*) >= 50
)
SELECT 
    *,
    -- Efficiency score: high speed + low variance = efficient
    ROUND((avg_speed / 25.0) * (1 - LEAST(speed_variance / 10.0, 1)) * 100, 0) as efficiency_score
FROM segments;

-- ============================================================================
-- SITE_DASHBOARD_METRICS - Pre-aggregated metrics for dashboard
-- ============================================================================
CREATE OR REPLACE VIEW SITE_DASHBOARD_METRICS AS
SELECT 
    s.site_id,
    s.site_name,
    s.site_type,
    s.latitude,
    s.longitude,
    s.status,
    -- Equipment counts
    COUNT(DISTINCT e.equipment_id) as total_equipment,
    COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.equipment_id END) as active_equipment,
    -- Recent volumes
    vol.total_cut_actual,
    vol.total_fill_actual,
    vol.overall_progress_pct,
    -- Ghost cycles (last 24h)
    gc.ghost_cycle_count,
    gc.total_fuel_waste_gal,
    -- Choke points
    cp.choke_point_count
FROM RAW.SITES s
LEFT JOIN RAW.EQUIPMENT e ON s.site_id = e.site_id
LEFT JOIN (
    SELECT site_id, 
           SUM(total_cut_actual) as total_cut_actual,
           SUM(total_fill_actual) as total_fill_actual,
           AVG(overall_progress_pct) as overall_progress_pct
    FROM DAILY_VOLUME_SUMMARY
    WHERE survey_date = CURRENT_DATE()
    GROUP BY site_id
) vol ON s.site_id = vol.site_id
LEFT JOIN (
    SELECT site_id, 
           COUNT(*) as ghost_cycle_count,
           SUM(estimated_fuel_waste_gal) as total_fuel_waste_gal
    FROM GHOST_CYCLE_DETECTION
    WHERE period_start >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
    GROUP BY site_id
) gc ON s.site_id = gc.site_id
LEFT JOIN (
    SELECT site_id,
           COUNT(*) as choke_point_count
    FROM CHOKE_POINT_ANALYSIS
    WHERE analysis_date = CURRENT_DATE() AND severity IN ('HIGH', 'MEDIUM')
    GROUP BY site_id
) cp ON s.site_id = cp.site_id
GROUP BY s.site_id, s.site_name, s.site_type, s.latitude, s.longitude, s.status,
         vol.total_cut_actual, vol.total_fill_actual, vol.overall_progress_pct,
         gc.ghost_cycle_count, gc.total_fuel_waste_gal, cp.choke_point_count;
