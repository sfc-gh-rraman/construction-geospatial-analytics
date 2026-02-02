#!/bin/bash
# =============================================================================
# Deploy ML Notebooks to Snowflake
# =============================================================================
# This script uploads and deploys the ML notebooks to Snowflake for execution
# in Snowsight Notebooks.
#
# Prerequisites:
# - snow CLI installed and configured
# - CONSTRUCTION_GEO_DB database exists
# - ML schema has been created (run ddl/005_ml_schema.sql first)
# =============================================================================

set -e

echo "🚀 Deploying Construction Geospatial ML Notebooks"
echo "=================================================="

# Configuration
DATABASE="CONSTRUCTION_GEO_DB"
SCHEMA="NOTEBOOKS"
STAGE="ML_NOTEBOOKS_STAGE"
WAREHOUSE="COMPUTE_WH"

# Create notebooks schema if needed
echo "📁 Creating notebooks schema..."
snow sql -q "CREATE SCHEMA IF NOT EXISTS ${DATABASE}.${SCHEMA};"

# Create stage for notebooks
echo "📦 Creating stage for notebooks..."
snow sql -q "CREATE STAGE IF NOT EXISTS ${DATABASE}.${SCHEMA}.${STAGE};"

# Upload notebooks to stage
echo "⬆️  Uploading notebooks..."
snow stage copy ./01_ghost_cycle_detector.ipynb @${DATABASE}.${SCHEMA}.${STAGE}/ --overwrite
snow stage copy ./02_cycle_time_optimizer.ipynb @${DATABASE}.${SCHEMA}.${STAGE}/ --overwrite
snow stage copy ./03_choke_point_predictor.ipynb @${DATABASE}.${SCHEMA}.${STAGE}/ --overwrite

echo ""
echo "✅ Notebooks uploaded successfully!"
echo ""
echo "📝 Next Steps:"
echo "   1. Open Snowsight and navigate to Notebooks"
echo "   2. Import notebooks from stage: @${DATABASE}.${SCHEMA}.${STAGE}/"
echo "   3. Run each notebook in sequence:"
echo "      - 01_ghost_cycle_detector.ipynb (Ghost Cycle Detection with SHAP)"
echo "      - 02_cycle_time_optimizer.ipynb (Cycle Time with PDP)"
echo "      - 03_choke_point_predictor.ipynb (Choke Point with Calibration)"
echo ""
echo "📊 Models will be registered to:"
echo "   - GHOST_CYCLE_DETECTOR"
echo "   - CYCLE_TIME_OPTIMIZER"
echo "   - CHOKE_POINT_PREDICTOR"
echo ""
echo "📈 Explainability data exported to:"
echo "   - ML.GLOBAL_FEATURE_IMPORTANCE (SHAP values)"
echo "   - ML.PARTIAL_DEPENDENCE_CURVES (PDP data)"
echo "   - ML.CALIBRATION_CURVES (probability calibration)"
echo "   - ML.MODEL_METRICS (performance metrics)"
