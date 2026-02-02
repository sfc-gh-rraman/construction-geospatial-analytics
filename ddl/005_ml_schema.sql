-- ============================================================================
-- ML Schema: Explainability Tables for Construction Geospatial Analytics
-- ============================================================================
-- This schema stores ML model explainability data including:
-- - Global feature importance (SHAP values)
-- - Partial dependence curves
-- - Feature interactions
-- - Model performance metrics
-- - Calibration curves
-- - Per-prediction explanations
-- ============================================================================

USE DATABASE CONSTRUCTION_GEO_DB;

-- Create ML Schema
CREATE SCHEMA IF NOT EXISTS ML;

USE SCHEMA ML;

-- ============================================================================
-- Table 1: GLOBAL_FEATURE_IMPORTANCE
-- Stores SHAP-based global feature importance for each model
-- ============================================================================
CREATE OR REPLACE TABLE GLOBAL_FEATURE_IMPORTANCE (
    IMPORTANCE_ID VARCHAR DEFAULT UUID_STRING(),
    MODEL_NAME VARCHAR NOT NULL,
    MODEL_VERSION VARCHAR DEFAULT 'v1.0',
    FEATURE_NAME VARCHAR NOT NULL,
    SHAP_IMPORTANCE FLOAT NOT NULL,           -- Absolute mean SHAP value
    SHAP_IMPORTANCE_STD FLOAT,                -- Standard deviation of SHAP values
    IMPORTANCE_RANK INT NOT NULL,             -- 1 = most important
    FEATURE_DIRECTION VARCHAR,                -- 'positive', 'negative', 'mixed'
    COMPUTED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    TRAINING_SAMPLES INT,                     -- Number of samples used
    
    PRIMARY KEY (IMPORTANCE_ID)
);

COMMENT ON TABLE GLOBAL_FEATURE_IMPORTANCE IS 
'Global SHAP-based feature importance values for each ML model. 
Used to answer questions like "What are the top drivers of Ghost Cycles?"';

-- ============================================================================
-- Table 2: PARTIAL_DEPENDENCE_CURVES
-- Stores precomputed PDP values for interactive visualization
-- ============================================================================
CREATE OR REPLACE TABLE PARTIAL_DEPENDENCE_CURVES (
    PDP_ID VARCHAR DEFAULT UUID_STRING(),
    MODEL_NAME VARCHAR NOT NULL,
    MODEL_VERSION VARCHAR DEFAULT 'v1.0',
    FEATURE_NAME VARCHAR NOT NULL,
    FEATURE_VALUE FLOAT NOT NULL,             -- X-axis value
    PREDICTED_VALUE FLOAT NOT NULL,           -- Y-axis (avg prediction)
    LOWER_BOUND FLOAT,                        -- 10th percentile
    UPPER_BOUND FLOAT,                        -- 90th percentile
    ICE_STD FLOAT,                            -- Std dev across ICE curves
    SAMPLE_COUNT INT,                         -- Observations at this value
    COMPUTED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    
    PRIMARY KEY (PDP_ID)
);

COMMENT ON TABLE PARTIAL_DEPENDENCE_CURVES IS 
'Partial Dependence Plot data showing how each feature affects model predictions.
Used for visualizing relationships like "How does speed affect cycle time?"';

-- ============================================================================
-- Table 3: FEATURE_INTERACTIONS
-- Stores pairwise feature interaction strengths
-- ============================================================================
CREATE OR REPLACE TABLE FEATURE_INTERACTIONS (
    INTERACTION_ID VARCHAR DEFAULT UUID_STRING(),
    MODEL_NAME VARCHAR NOT NULL,
    MODEL_VERSION VARCHAR DEFAULT 'v1.0',
    FEATURE_A VARCHAR NOT NULL,
    FEATURE_B VARCHAR NOT NULL,
    INTERACTION_STRENGTH FLOAT NOT NULL,      -- H-statistic or SHAP interaction
    INTERACTION_TYPE VARCHAR,                 -- 'synergistic', 'antagonistic', 'complex'
    DESCRIPTION VARCHAR,                      -- Human-readable interpretation
    COMPUTED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    
    PRIMARY KEY (INTERACTION_ID)
);

COMMENT ON TABLE FEATURE_INTERACTIONS IS 
'Pairwise feature interaction strengths. High values indicate features 
work together (e.g., speed and engine load for Ghost Cycle detection).';

-- ============================================================================
-- Table 4: MODEL_METRICS
-- Stores model performance metrics for each version
-- ============================================================================
CREATE OR REPLACE TABLE MODEL_METRICS (
    METRIC_ID VARCHAR DEFAULT UUID_STRING(),
    MODEL_NAME VARCHAR NOT NULL,
    MODEL_VERSION VARCHAR DEFAULT 'v1.0',
    METRIC_NAME VARCHAR NOT NULL,             -- 'accuracy', 'precision', 'recall', 'f1', 'r2', 'mae', 'rmse'
    METRIC_VALUE FLOAT NOT NULL,
    METRIC_CONTEXT VARCHAR,                   -- 'train', 'test', 'validation', 'production'
    THRESHOLD FLOAT,                          -- Decision threshold (for classification)
    EVALUATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    EVALUATION_DATASET VARCHAR,               -- Description of dataset used
    SAMPLE_COUNT INT,                         -- Number of samples evaluated
    
    PRIMARY KEY (METRIC_ID)
);

COMMENT ON TABLE MODEL_METRICS IS 
'Performance metrics for each model version. Includes accuracy, precision, recall, 
F1 for classifiers; R², MAE, RMSE for regressors.';

-- ============================================================================
-- Table 5: CALIBRATION_CURVES
-- Stores calibration data for probability models (Choke Point Prediction)
-- ============================================================================
CREATE OR REPLACE TABLE CALIBRATION_CURVES (
    CALIBRATION_ID VARCHAR DEFAULT UUID_STRING(),
    MODEL_NAME VARCHAR NOT NULL,
    MODEL_VERSION VARCHAR DEFAULT 'v1.0',
    PREDICTED_PROB_BIN FLOAT NOT NULL,        -- Center of probability bin (0.05, 0.15, ...)
    ACTUAL_FREQUENCY FLOAT NOT NULL,          -- Actual positive rate in this bin
    BIN_COUNT INT NOT NULL,                   -- Number of predictions in this bin
    BIN_LOWER FLOAT,                          -- Lower bound of bin
    BIN_UPPER FLOAT,                          -- Upper bound of bin
    COMPUTED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    
    PRIMARY KEY (CALIBRATION_ID)
);

COMMENT ON TABLE CALIBRATION_CURVES IS 
'Calibration curve data showing if predicted probabilities match actual frequencies.
Critical for proactive choke point predictions.';

-- ============================================================================
-- Table 6: CONFUSION_MATRIX
-- Stores confusion matrix data for classification models
-- ============================================================================
CREATE OR REPLACE TABLE CONFUSION_MATRIX (
    MATRIX_ID VARCHAR DEFAULT UUID_STRING(),
    MODEL_NAME VARCHAR NOT NULL,
    MODEL_VERSION VARCHAR DEFAULT 'v1.0',
    ACTUAL_CLASS VARCHAR NOT NULL,            -- 'ghost_cycle', 'normal', 'choke_point', etc.
    PREDICTED_CLASS VARCHAR NOT NULL,
    COUNT INT NOT NULL,
    THRESHOLD FLOAT,                          -- Decision threshold used
    COMPUTED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    EVALUATION_DATASET VARCHAR,
    
    PRIMARY KEY (MATRIX_ID)
);

COMMENT ON TABLE CONFUSION_MATRIX IS 
'Confusion matrix data for classification models. Shows true/false positives/negatives.';

-- ============================================================================
-- Table 7: PREDICTION_EXPLANATIONS
-- Stores per-prediction SHAP values for recent predictions
-- ============================================================================
CREATE OR REPLACE TABLE PREDICTION_EXPLANATIONS (
    EXPLANATION_ID VARCHAR DEFAULT UUID_STRING(),
    MODEL_NAME VARCHAR NOT NULL,
    MODEL_VERSION VARCHAR DEFAULT 'v1.0',
    EQUIPMENT_ID VARCHAR NOT NULL,
    SITE_ID VARCHAR,
    TIMESTAMP TIMESTAMP_NTZ,
    
    -- Prediction details
    PREDICTION FLOAT NOT NULL,                -- Model output
    PREDICTION_CLASS VARCHAR,                 -- For classifiers: 'ghost_cycle', 'normal'
    CONFIDENCE FLOAT,                         -- Model confidence (0-1)
    
    -- Feature values at prediction time
    INPUT_FEATURES VARIANT NOT NULL,          -- JSON: {"speed": 4.2, "engine_load": 22, ...}
    
    -- SHAP explanations
    FEATURE_CONTRIBUTIONS VARIANT NOT NULL,   -- JSON: {"speed": 0.15, "engine_load": -0.28, ...}
    BASE_VALUE FLOAT,                         -- SHAP base value (expected value)
    
    -- Metadata
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    
    PRIMARY KEY (EXPLANATION_ID)
);

COMMENT ON TABLE PREDICTION_EXPLANATIONS IS 
'Per-prediction SHAP explanations. Enables answering 
"Why did the model flag T-15 as a Ghost Cycle at this time?"';

-- ============================================================================
-- Table 8: OPTIMAL_PARAMETERS_BY_CONTEXT
-- Stores context-aware optimal parameters from Cycle Time model
-- ============================================================================
CREATE OR REPLACE TABLE OPTIMAL_PARAMETERS_BY_CONTEXT (
    PARAM_ID VARCHAR DEFAULT UUID_STRING(),
    CONTEXT_TYPE VARCHAR NOT NULL,            -- 'route', 'time_of_day', 'site'
    CONTEXT_VALUE VARCHAR NOT NULL,           -- 'North_Route', 'morning', 'alpha'
    
    -- Optimal parameters
    OPTIMAL_SPEED_MPH FLOAT,
    OPTIMAL_LOAD_TONS FLOAT,
    OPTIMAL_ROUTE_SEGMENT VARCHAR,
    
    -- Expected outcomes
    PREDICTED_CYCLE_TIME_MIN FLOAT,
    PREDICTION_CONFIDENCE FLOAT,
    
    -- Supporting evidence
    SAMPLE_COUNT INT,                         -- Number of observations
    EVIDENCE_EQUIPMENT ARRAY,                 -- Equipment that achieved this
    
    COMPUTED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    
    PRIMARY KEY (PARAM_ID)
);

COMMENT ON TABLE OPTIMAL_PARAMETERS_BY_CONTEXT IS 
'Context-aware optimal haul parameters derived from Cycle Time model.
Grouped by routes, time of day, or specific sites.';

-- ============================================================================
-- Table 9: GHOST_CYCLE_PREDICTIONS (specific to construction)
-- Stores recent Ghost Cycle model predictions for fleet monitoring
-- ============================================================================
CREATE OR REPLACE TABLE GHOST_CYCLE_PREDICTIONS (
    PREDICTION_ID VARCHAR DEFAULT UUID_STRING(),
    EQUIPMENT_ID VARCHAR NOT NULL,
    SITE_ID VARCHAR NOT NULL,
    TIMESTAMP TIMESTAMP_NTZ NOT NULL,
    LATITUDE FLOAT,
    LONGITUDE FLOAT,
    
    -- Input features
    GPS_SPEED_MPH FLOAT,
    ENGINE_LOAD_PCT FLOAT,
    FUEL_RATE_GPH FLOAT,
    
    -- Prediction
    IS_GHOST_CYCLE BOOLEAN,
    GHOST_PROBABILITY FLOAT,
    
    -- Estimated impact
    ESTIMATED_FUEL_WASTE_GAL FLOAT,
    DURATION_MINUTES FLOAT,
    
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    
    PRIMARY KEY (PREDICTION_ID)
);

COMMENT ON TABLE GHOST_CYCLE_PREDICTIONS IS 
'Real-time Ghost Cycle predictions from ML model. 
Used by Watchdog agent to alert on fuel waste patterns.';

-- ============================================================================
-- Table 10: CHOKE_POINT_PREDICTIONS (specific to construction)
-- Stores predicted choke points before they fully form
-- ============================================================================
CREATE OR REPLACE TABLE CHOKE_POINT_PREDICTIONS (
    PREDICTION_ID VARCHAR DEFAULT UUID_STRING(),
    SITE_ID VARCHAR NOT NULL,
    ZONE_LAT FLOAT,
    ZONE_LNG FLOAT,
    ZONE_NAME VARCHAR,
    PREDICTION_TIMESTAMP TIMESTAMP_NTZ NOT NULL,
    
    -- Prediction
    CHOKE_PROBABILITY FLOAT,
    PREDICTED_SEVERITY VARCHAR,           -- 'HIGH', 'MEDIUM', 'LOW'
    PREDICTED_WAIT_TIME_MIN FLOAT,
    PREDICTED_TRUCKS_AFFECTED INT,
    
    -- Timing
    PREDICTED_ONSET_TIME TIMESTAMP_NTZ,   -- When choke point expected to form
    PREDICTION_HORIZON_MIN INT,           -- How far ahead we're predicting
    
    -- Recommendation
    RECOMMENDED_ACTION VARCHAR,
    
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    
    PRIMARY KEY (PREDICTION_ID)
);

COMMENT ON TABLE CHOKE_POINT_PREDICTIONS IS 
'Proactive choke point predictions. Enables Route Advisor agent 
to recommend diversions before bottlenecks fully form.';

-- ============================================================================
-- Views for easy querying
-- ============================================================================

-- View: Top features by model
CREATE OR REPLACE VIEW V_TOP_FEATURES_BY_MODEL AS
SELECT 
    MODEL_NAME,
    FEATURE_NAME,
    SHAP_IMPORTANCE,
    IMPORTANCE_RANK,
    FEATURE_DIRECTION,
    COMPUTED_AT
FROM GLOBAL_FEATURE_IMPORTANCE
WHERE IMPORTANCE_RANK <= 10
ORDER BY MODEL_NAME, IMPORTANCE_RANK;

-- View: Latest model metrics
CREATE OR REPLACE VIEW V_LATEST_MODEL_METRICS AS
SELECT 
    m.*
FROM MODEL_METRICS m
INNER JOIN (
    SELECT MODEL_NAME, METRIC_NAME, MAX(EVALUATED_AT) as MAX_EVAL
    FROM MODEL_METRICS
    GROUP BY MODEL_NAME, METRIC_NAME
) latest ON m.MODEL_NAME = latest.MODEL_NAME 
        AND m.METRIC_NAME = latest.METRIC_NAME 
        AND m.EVALUATED_AT = latest.MAX_EVAL;

-- View: Active Ghost Cycles (last hour)
CREATE OR REPLACE VIEW V_ACTIVE_GHOST_CYCLES AS
SELECT 
    EQUIPMENT_ID,
    SITE_ID,
    TIMESTAMP,
    GPS_SPEED_MPH,
    ENGINE_LOAD_PCT,
    GHOST_PROBABILITY,
    ESTIMATED_FUEL_WASTE_GAL,
    DURATION_MINUTES
FROM GHOST_CYCLE_PREDICTIONS
WHERE IS_GHOST_CYCLE = TRUE
  AND TIMESTAMP >= DATEADD(hour, -1, CURRENT_TIMESTAMP())
ORDER BY TIMESTAMP DESC;

-- View: Upcoming Choke Points (predictions for next 30 min)
CREATE OR REPLACE VIEW V_UPCOMING_CHOKE_POINTS AS
SELECT 
    SITE_ID,
    ZONE_NAME,
    CHOKE_PROBABILITY,
    PREDICTED_SEVERITY,
    PREDICTED_WAIT_TIME_MIN,
    PREDICTED_TRUCKS_AFFECTED,
    PREDICTED_ONSET_TIME,
    RECOMMENDED_ACTION
FROM CHOKE_POINT_PREDICTIONS
WHERE PREDICTED_ONSET_TIME BETWEEN CURRENT_TIMESTAMP() AND DATEADD(minute, 30, CURRENT_TIMESTAMP())
  AND CHOKE_PROBABILITY > 0.5
ORDER BY CHOKE_PROBABILITY DESC;

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT USAGE ON SCHEMA ML TO ROLE PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA ML TO ROLE PUBLIC;
GRANT SELECT ON ALL VIEWS IN SCHEMA ML TO ROLE PUBLIC;

-- ============================================================================
-- Summary
-- ============================================================================
SELECT 'ML Schema created successfully' as STATUS;

SHOW TABLES IN SCHEMA ML;
