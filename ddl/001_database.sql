-- ============================================================================
-- TERRA Construction Geospatial Analytics - Database Setup
-- ============================================================================
-- This script creates the database, schemas, and warehouses for the 
-- construction geospatial analytics demo.

-- Create database
CREATE DATABASE IF NOT EXISTS CONSTRUCTION_GEO_DB;

USE DATABASE CONSTRUCTION_GEO_DB;

-- Create schemas following medallion architecture
CREATE SCHEMA IF NOT EXISTS RAW;           -- Raw ingested data
CREATE SCHEMA IF NOT EXISTS ATOMIC;        -- Cleaned/normalized data  
CREATE SCHEMA IF NOT EXISTS CONSTRUCTION_GEO;  -- Data mart / analytics

-- Create compute warehouse
CREATE WAREHOUSE IF NOT EXISTS CONSTRUCTION_WH
    WAREHOUSE_SIZE = 'SMALL'
    AUTO_SUSPEND = 60
    AUTO_RESUME = TRUE;

-- Grant permissions (adjust role as needed)
GRANT USAGE ON DATABASE CONSTRUCTION_GEO_DB TO ROLE ACCOUNTADMIN;
GRANT USAGE ON ALL SCHEMAS IN DATABASE CONSTRUCTION_GEO_DB TO ROLE ACCOUNTADMIN;
GRANT ALL ON ALL TABLES IN DATABASE CONSTRUCTION_GEO_DB TO ROLE ACCOUNTADMIN;
GRANT USAGE ON WAREHOUSE CONSTRUCTION_WH TO ROLE ACCOUNTADMIN;

-- Enable Cortex
ALTER DATABASE CONSTRUCTION_GEO_DB SET CORTEX_ENABLED = TRUE;
