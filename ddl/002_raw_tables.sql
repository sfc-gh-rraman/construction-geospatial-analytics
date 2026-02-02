-- ============================================================================
-- GROUNDTRUTH Construction Geospatial Analytics - RAW Schema Tables
-- ============================================================================
-- Raw data tables for ingesting GPS, telematics, and operational data

USE DATABASE CONSTRUCTION_GEO_DB;
USE SCHEMA RAW;

-- ============================================================================
-- SITES - Construction site definitions
-- ============================================================================
CREATE OR REPLACE TABLE SITES (
    site_id VARCHAR(50) PRIMARY KEY,
    site_name VARCHAR(200) NOT NULL,
    site_type VARCHAR(100),
    latitude FLOAT,
    longitude FLOAT,
    status VARCHAR(50) DEFAULT 'active',
    client_name VARCHAR(200),
    project_start_date DATE,
    project_end_date DATE,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================================
-- EQUIPMENT - Equipment/vehicle master data
-- ============================================================================
CREATE OR REPLACE TABLE EQUIPMENT (
    equipment_id VARCHAR(50) PRIMARY KEY,
    site_id VARCHAR(50) REFERENCES SITES(site_id),
    equipment_name VARCHAR(200) NOT NULL,
    equipment_type VARCHAR(100), -- haul_truck, dozer, loader, grader, etc.
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    capacity_tons FLOAT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================================
-- GPS_BREADCRUMBS - Real-time GPS position data
-- ============================================================================
CREATE OR REPLACE TABLE GPS_BREADCRUMBS (
    breadcrumb_id VARCHAR(100) PRIMARY KEY,
    equipment_id VARCHAR(50) REFERENCES EQUIPMENT(equipment_id),
    site_id VARCHAR(50) REFERENCES SITES(site_id),
    timestamp TIMESTAMP_NTZ NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    altitude_m FLOAT,
    speed_mph FLOAT,
    heading_degrees FLOAT,
    accuracy_m FLOAT,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================================
-- EQUIPMENT_TELEMATICS - Engine and operational telemetry
-- ============================================================================
CREATE OR REPLACE TABLE EQUIPMENT_TELEMATICS (
    telematics_id VARCHAR(100) PRIMARY KEY,
    equipment_id VARCHAR(50) REFERENCES EQUIPMENT(equipment_id),
    timestamp TIMESTAMP_NTZ NOT NULL,
    engine_load_percent FLOAT,
    fuel_rate_gph FLOAT,
    engine_rpm INTEGER,
    coolant_temp_f FLOAT,
    oil_pressure_psi FLOAT,
    transmission_gear INTEGER,
    payload_tons FLOAT,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================================
-- CYCLE_EVENTS - Load/dump cycle events
-- ============================================================================
CREATE OR REPLACE TABLE CYCLE_EVENTS (
    cycle_id VARCHAR(100) PRIMARY KEY,
    equipment_id VARCHAR(50) REFERENCES EQUIPMENT(equipment_id),
    site_id VARCHAR(50) REFERENCES SITES(site_id),
    cycle_start TIMESTAMP_NTZ,
    cycle_end TIMESTAMP_NTZ,
    load_location VARCHAR(200),
    dump_location VARCHAR(200),
    load_volume_yd3 FLOAT,
    cycle_time_minutes FLOAT,
    haul_distance_miles FLOAT,
    fuel_consumed_gal FLOAT,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================================
-- VOLUME_SURVEYS - Cut/fill volume survey data
-- ============================================================================
CREATE OR REPLACE TABLE VOLUME_SURVEYS (
    survey_id VARCHAR(100) PRIMARY KEY,
    site_id VARCHAR(50) REFERENCES SITES(site_id),
    zone_id VARCHAR(50),
    zone_name VARCHAR(200),
    survey_date DATE NOT NULL,
    survey_type VARCHAR(50), -- drone, ground, lidar
    cut_volume_yd3 FLOAT,
    fill_volume_yd3 FLOAT,
    cut_plan_yd3 FLOAT,
    fill_plan_yd3 FLOAT,
    elevation_avg_m FLOAT,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================================
-- SITE_DOCUMENTS - Documents for Cortex Search
-- ============================================================================
CREATE OR REPLACE TABLE SITE_DOCUMENTS (
    document_id VARCHAR(100) PRIMARY KEY,
    site_id VARCHAR(50),
    title VARCHAR(500) NOT NULL,
    document_type VARCHAR(100), -- geotech, safety, equipment, procedure
    content TEXT,
    summary VARCHAR(2000),
    author VARCHAR(200),
    document_date DATE,
    file_path VARCHAR(500),
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE OR REPLACE INDEX idx_gps_equipment_time ON GPS_BREADCRUMBS(equipment_id, timestamp);
CREATE OR REPLACE INDEX idx_gps_site_time ON GPS_BREADCRUMBS(site_id, timestamp);
CREATE OR REPLACE INDEX idx_telematics_equipment_time ON EQUIPMENT_TELEMATICS(equipment_id, timestamp);
CREATE OR REPLACE INDEX idx_cycles_site ON CYCLE_EVENTS(site_id, cycle_start);
CREATE OR REPLACE INDEX idx_surveys_site_date ON VOLUME_SURVEYS(site_id, survey_date);
