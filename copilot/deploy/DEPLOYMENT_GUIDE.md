# GROUNDTRUTH Deployment Guide

## Overview

This guide covers deploying GROUNDTRUTH to Snowpark Container Services (SPCS).

## Prerequisites

1. **Snowflake Account** with SPCS enabled
2. **Docker** installed and running
3. **snow CLI** installed and configured
4. **Database Setup** completed (see DDL scripts)

## Quick Start

```bash
# From the copilot directory
cd deploy

# Build, push, and deploy in one command
./deploy.sh all
```

## Step-by-Step Deployment

### 1. Database Setup

First, run the DDL scripts to create the database and tables:

```sql
-- Run in Snowflake
USE ROLE ACCOUNTADMIN;

-- Create database and schemas
!source ../ddl/001_database.sql
!source ../ddl/002_raw_tables.sql
!source ../ddl/003_data_mart.sql
!source ../ddl/004_cortex_services.sql
```

### 2. Generate Sample Data

```bash
# From project root
cd scripts
pip install pandas numpy pyarrow
python generate_sample_data.py --output ../data --format parquet
```

### 3. Load Data to Snowflake

```sql
-- Create stage
CREATE OR REPLACE STAGE CONSTRUCTION_GEO_DB.RAW.DATA_STAGE;

-- Upload files using snow CLI
-- snow stage copy ../data/*.parquet @CONSTRUCTION_GEO_DB.RAW.DATA_STAGE

-- Load data
COPY INTO CONSTRUCTION_GEO_DB.RAW.SITES FROM @DATA_STAGE/sites.parquet FILE_FORMAT = (TYPE = PARQUET);
COPY INTO CONSTRUCTION_GEO_DB.RAW.EQUIPMENT FROM @DATA_STAGE/equipment.parquet FILE_FORMAT = (TYPE = PARQUET);
-- ... repeat for other tables
```

### 4. Build Docker Image

```bash
./deploy.sh build
```

### 5. Push to Snowflake Repository

```bash
./deploy.sh push
```

### 6. Deploy Service

```bash
./deploy.sh deploy
```

### 7. Verify Deployment

```bash
./deploy.sh status
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SPCS Container                           │
│  ┌─────────────┐     ┌─────────────────────────────────┐   │
│  │   Nginx     │     │       FastAPI Backend           │   │
│  │  (port 8080)│────▶│        (port 8000)              │   │
│  │             │     │  ┌───────────────────────────┐  │   │
│  │  - Static   │     │  │ Agent Orchestrator        │  │   │
│  │    files    │     │  │  ├─ Historian Agent       │  │   │
│  │  - /api/    │     │  │  ├─ Route Advisor Agent   │  │   │
│  │    proxy    │     │  │  └─ Watchdog Agent        │  │   │
│  └─────────────┘     │  └───────────────────────────┘  │   │
│                      └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                           │
         │                           │ OAuth Token
         ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Snowflake                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐  │
│  │  GPS_BREADCRUMBS │  │ VOLUME_SURVEYS  │  │  CORTEX    │  │
│  │  TELEMATICS      │  │ CYCLE_EVENTS    │  │  Search    │  │
│  │  EQUIPMENT       │  │ SITES           │  │  LLM       │  │
│  └─────────────────┘  └─────────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SNOWFLAKE_DATABASE` | Target database | CONSTRUCTION_GEO_DB |
| `SNOWFLAKE_SCHEMA` | Target schema | CONSTRUCTION_GEO |
| `SNOWFLAKE_WAREHOUSE` | Compute warehouse | CONSTRUCTION_WH |

## Troubleshooting

### Service Won't Start

Check logs:
```sql
SELECT * FROM TABLE(CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.groundtruth_service!GET_SERVICE_LOGS('groundtruth', 0, 100));
```

### API Returns Errors

1. Verify database connection:
```sql
SELECT * FROM CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SITE_DASHBOARD_METRICS;
```

2. Check Cortex Search service:
```sql
DESCRIBE CORTEX SEARCH SERVICE SITE_DOCUMENTS_SEARCH;
```

### Frontend Not Loading

1. Check nginx logs in container
2. Verify static files were built correctly
3. Ensure port 8080 is exposed

## User Access

Grant access to users:
```sql
-- Create role for GROUNDTRUTH users
CREATE ROLE IF NOT EXISTS GROUNDTRUTH_USER;

-- Grant service access
GRANT USAGE ON SERVICE CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.groundtruth_service TO ROLE GROUNDTRUTH_USER;

-- Grant database access
GRANT USAGE ON DATABASE CONSTRUCTION_GEO_DB TO ROLE GROUNDTRUTH_USER;
GRANT USAGE ON SCHEMA CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO TO ROLE GROUNDTRUTH_USER;
GRANT SELECT ON ALL VIEWS IN SCHEMA CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO TO ROLE GROUNDTRUTH_USER;

-- Grant Cortex Search access
GRANT USAGE ON CORTEX SEARCH SERVICE SITE_DOCUMENTS_SEARCH TO ROLE GROUNDTRUTH_USER;

-- Assign role to user
GRANT ROLE GROUNDTRUTH_USER TO USER <username>;
```

## Local Development

For local development without SPCS:

```bash
# Terminal 1: Start backend
cd copilot/backend
pip install -r requirements.txt
python -m uvicorn api.main:app --reload --port 8000

# Terminal 2: Start frontend
cd copilot/frontend
npm install
npm run dev
```

Access at: http://localhost:5173
