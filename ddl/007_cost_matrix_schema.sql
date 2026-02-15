-- ============================================================================
-- Cost Matrix Schema: Business Value Analysis for ML Predictions
-- ============================================================================
-- Transforms raw ML confusion matrix into business dollars
-- Enables: "How much did ghost cycle detection save us this week?"
-- Rollup: Equipment → Site → Portfolio
-- ============================================================================

USE DATABASE CONSTRUCTION_GEO_DB;
USE SCHEMA ML;

-- ============================================================================
-- COST ASSUMPTIONS (Documented for transparency)
-- ============================================================================
-- These assumptions should be reviewed quarterly with operations team
-- ============================================================================

CREATE OR REPLACE TABLE COST_ASSUMPTIONS (
    ASSUMPTION_ID VARCHAR DEFAULT UUID_STRING(),
    MODEL_NAME VARCHAR NOT NULL,
    COST_TYPE VARCHAR NOT NULL,           -- 'TRUE_POSITIVE', 'FALSE_POSITIVE', 'FALSE_NEGATIVE', 'TRUE_NEGATIVE'
    COST_CATEGORY VARCHAR NOT NULL,       -- 'FUEL', 'LABOR', 'EQUIPMENT', 'OPPORTUNITY'
    
    -- Cost parameters
    UNIT_COST_USD FLOAT NOT NULL,         -- Dollar amount per unit
    UNIT_DESCRIPTION VARCHAR NOT NULL,    -- 'per gallon', 'per hour', 'per incident'
    ESTIMATED_UNITS_PER_EVENT FLOAT,      -- How many units per prediction outcome
    
    -- Derived cost per event
    COST_PER_EVENT_USD FLOAT GENERATED ALWAYS AS (UNIT_COST_USD * COALESCE(ESTIMATED_UNITS_PER_EVENT, 1)) STORED,
    
    -- Sign convention: positive = savings/benefit, negative = loss/cost
    SIGN_CONVENTION VARCHAR NOT NULL,     -- 'BENEFIT' (+) or 'COST' (-)
    
    -- Metadata
    ASSUMPTION_SOURCE VARCHAR,            -- 'Operations Team', 'Industry Standard', 'Historical Analysis'
    EFFECTIVE_DATE DATE DEFAULT CURRENT_DATE(),
    EXPIRES_DATE DATE,
    NOTES VARCHAR,
    
    PRIMARY KEY (ASSUMPTION_ID)
);

-- ============================================================================
-- Insert Cost Assumptions for Each Model
-- ============================================================================

-- GHOST_CYCLE_DETECTOR Assumptions
INSERT INTO COST_ASSUMPTIONS (MODEL_NAME, COST_TYPE, COST_CATEGORY, UNIT_COST_USD, UNIT_DESCRIPTION, ESTIMATED_UNITS_PER_EVENT, SIGN_CONVENTION, ASSUMPTION_SOURCE, NOTES)
VALUES
-- True Positive: We caught a ghost cycle, saved fuel
('GHOST_CYCLE_DETECTOR', 'TRUE_POSITIVE', 'FUEL', 3.80, 'per gallon', 6.5, 'BENEFIT', 
 'Operations Team Q1 2024', 'Avg ghost cycle burns 6.5 gal before correction. $3.80/gal diesel.'),

-- False Positive: We flagged legitimate operation, wasted investigation time  
('GHOST_CYCLE_DETECTOR', 'FALSE_POSITIVE', 'LABOR', 45.00, 'per hour', 0.25, 'COST',
 'HR Fully-Loaded Rate', 'Supervisor investigates for ~15 min. $45/hr fully loaded.'),

-- False Negative: We missed a ghost cycle, fuel wasted until natural correction
('GHOST_CYCLE_DETECTOR', 'FALSE_NEGATIVE', 'FUEL', 3.80, 'per gallon', 19.5, 'COST',
 'Telematics Analysis', 'Undetected ghost cycles avg 3 hours before natural end. 6.5 gal/hr.'),

-- True Negative: Correctly identified normal operation, no cost
('GHOST_CYCLE_DETECTOR', 'TRUE_NEGATIVE', 'NONE', 0.00, 'per event', 1, 'BENEFIT',
 'Baseline', 'No action needed, no cost incurred.');

-- CHOKE_POINT_PREDICTOR Assumptions
INSERT INTO COST_ASSUMPTIONS (MODEL_NAME, COST_TYPE, COST_CATEGORY, UNIT_COST_USD, UNIT_DESCRIPTION, ESTIMATED_UNITS_PER_EVENT, SIGN_CONVENTION, ASSUMPTION_SOURCE, NOTES)
VALUES
-- True Positive: Predicted choke point, diverted trucks, saved idle time
('CHOKE_POINT_PREDICTOR', 'TRUE_POSITIVE', 'FUEL', 2.50, 'per truck-minute', 45, 'BENEFIT',
 'Fleet Analytics', 'Avg 3 trucks saved 15 min each. $2.50/min idle cost (fuel + opportunity).'),

-- False Positive: Predicted choke that didn't form, unnecessary reroute
('CHOKE_POINT_PREDICTOR', 'FALSE_POSITIVE', 'FUEL', 3.80, 'per gallon', 4.2, 'COST',
 'Route Analysis', 'Alternate route adds 1.1 miles avg. 3.8 gal extra at 0.9 mi/gal loaded.'),

-- False Negative: Missed choke point, trucks queued
('CHOKE_POINT_PREDICTOR', 'FALSE_NEGATIVE', 'FUEL', 2.50, 'per truck-minute', 75, 'COST',
 'Queue Analysis', 'Avg 5 trucks wait 15 min in undetected choke. $2.50/min.'),

-- True Negative: Correctly predicted no choke, normal operations
('CHOKE_POINT_PREDICTOR', 'TRUE_NEGATIVE', 'NONE', 0.00, 'per event', 1, 'BENEFIT',
 'Baseline', 'No action needed.');

-- CYCLE_TIME_OPTIMIZER Assumptions (Regression model - different structure)
INSERT INTO COST_ASSUMPTIONS (MODEL_NAME, COST_TYPE, COST_CATEGORY, UNIT_COST_USD, UNIT_DESCRIPTION, ESTIMATED_UNITS_PER_EVENT, SIGN_CONVENTION, ASSUMPTION_SOURCE, NOTES)
VALUES
-- Good prediction within 2 min: Enables optimal dispatching
('CYCLE_TIME_OPTIMIZER', 'ACCURATE_PREDICTION', 'PRODUCTIVITY', 8.50, 'per minute saved', 2.5, 'BENEFIT',
 'Dispatch Optimization Study', 'Accurate predictions enable 2.5 min avg savings per dispatch.'),

-- Poor prediction (>5 min error): Causes mis-dispatch
('CYCLE_TIME_OPTIMIZER', 'INACCURATE_PREDICTION', 'PRODUCTIVITY', 8.50, 'per minute lost', 4.0, 'COST',
 'Dispatch Analysis', 'Bad predictions cause 4 min avg productivity loss.');

-- ============================================================================
-- COST_MATRIX: Actual costs realized from predictions
-- ============================================================================

CREATE OR REPLACE TABLE COST_MATRIX (
    COST_ID VARCHAR DEFAULT UUID_STRING(),
    MODEL_NAME VARCHAR NOT NULL,
    MODEL_VERSION VARCHAR DEFAULT 'v1.0',
    
    -- Time period
    PERIOD_START TIMESTAMP_NTZ NOT NULL,
    PERIOD_END TIMESTAMP_NTZ NOT NULL,
    PERIOD_TYPE VARCHAR NOT NULL,         -- 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'
    
    -- Scope
    SITE_ID VARCHAR,                      -- NULL = all sites (portfolio level)
    EQUIPMENT_ID VARCHAR,                 -- NULL = all equipment at site
    
    -- Prediction outcome counts
    TRUE_POSITIVE_COUNT INT DEFAULT 0,
    FALSE_POSITIVE_COUNT INT DEFAULT 0,
    FALSE_NEGATIVE_COUNT INT DEFAULT 0,
    TRUE_NEGATIVE_COUNT INT DEFAULT 0,
    
    -- Business costs (using assumptions)
    TRUE_POSITIVE_VALUE_USD FLOAT DEFAULT 0,    -- Positive = savings
    FALSE_POSITIVE_COST_USD FLOAT DEFAULT 0,    -- Positive = cost incurred
    FALSE_NEGATIVE_COST_USD FLOAT DEFAULT 0,    -- Positive = cost incurred
    TRUE_NEGATIVE_VALUE_USD FLOAT DEFAULT 0,    -- Usually 0
    
    -- Aggregated metrics
    GROSS_SAVINGS_USD FLOAT GENERATED ALWAYS AS (TRUE_POSITIVE_VALUE_USD + TRUE_NEGATIVE_VALUE_USD) STORED,
    GROSS_COSTS_USD FLOAT GENERATED ALWAYS AS (FALSE_POSITIVE_COST_USD + FALSE_NEGATIVE_COST_USD) STORED,
    NET_VALUE_USD FLOAT GENERATED ALWAYS AS (TRUE_POSITIVE_VALUE_USD - FALSE_POSITIVE_COST_USD - FALSE_NEGATIVE_COST_USD) STORED,
    
    -- Model performance at this threshold
    DECISION_THRESHOLD FLOAT,             -- Probability threshold used
    PRECISION_AT_THRESHOLD FLOAT,
    RECALL_AT_THRESHOLD FLOAT,
    
    COMPUTED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    
    PRIMARY KEY (COST_ID)
);

-- ============================================================================
-- PROFIT_CURVES: Expected profit at different probability thresholds
-- ============================================================================

CREATE OR REPLACE TABLE PROFIT_CURVES (
    CURVE_ID VARCHAR DEFAULT UUID_STRING(),
    MODEL_NAME VARCHAR NOT NULL,
    MODEL_VERSION VARCHAR DEFAULT 'v1.0',
    
    -- Scope
    SITE_ID VARCHAR,                      -- NULL = portfolio level
    
    -- Threshold analysis
    PROBABILITY_THRESHOLD FLOAT NOT NULL, -- 0.1, 0.2, ..., 0.9
    
    -- Expected outcomes at this threshold
    EXPECTED_TP_RATE FLOAT,               -- True positive rate (recall)
    EXPECTED_FP_RATE FLOAT,               -- False positive rate
    EXPECTED_PRECISION FLOAT,
    
    -- Cost analysis at this threshold
    EXPECTED_DAILY_SAVINGS_USD FLOAT,     -- From true positives
    EXPECTED_DAILY_COSTS_USD FLOAT,       -- From false positives
    EXPECTED_DAILY_MISSED_USD FLOAT,      -- From false negatives
    EXPECTED_NET_DAILY_VALUE_USD FLOAT,   -- Net daily value
    
    -- Optimal indicator
    IS_OPTIMAL_THRESHOLD BOOLEAN DEFAULT FALSE,
    
    -- Sample size for this analysis
    SAMPLE_EVENTS INT,
    ANALYSIS_PERIOD_DAYS INT,
    
    COMPUTED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    
    PRIMARY KEY (CURVE_ID)
);

-- ============================================================================
-- ROLLUP VIEWS: Equipment → Site → Portfolio
-- ============================================================================

-- Site-Level Cost Rollup
CREATE OR REPLACE VIEW V_SITE_COST_SUMMARY AS
SELECT 
    cm.MODEL_NAME,
    cm.SITE_ID,
    p.PROJECT_NAME as SITE_NAME,
    cm.PERIOD_TYPE,
    MIN(cm.PERIOD_START) as PERIOD_START,
    MAX(cm.PERIOD_END) as PERIOD_END,
    
    -- Prediction counts
    SUM(cm.TRUE_POSITIVE_COUNT) as TOTAL_TRUE_POSITIVES,
    SUM(cm.FALSE_POSITIVE_COUNT) as TOTAL_FALSE_POSITIVES,
    SUM(cm.FALSE_NEGATIVE_COUNT) as TOTAL_FALSE_NEGATIVES,
    SUM(cm.TRUE_NEGATIVE_COUNT) as TOTAL_TRUE_NEGATIVES,
    
    -- Business value
    SUM(cm.TRUE_POSITIVE_VALUE_USD) as TOTAL_SAVINGS_USD,
    SUM(cm.FALSE_POSITIVE_COST_USD) as TOTAL_FP_COSTS_USD,
    SUM(cm.FALSE_NEGATIVE_COST_USD) as TOTAL_FN_COSTS_USD,
    SUM(cm.NET_VALUE_USD) as NET_VALUE_USD,
    
    -- Efficiency metrics
    CASE WHEN SUM(cm.TRUE_POSITIVE_COUNT + cm.FALSE_NEGATIVE_COUNT) > 0 
         THEN SUM(cm.TRUE_POSITIVE_COUNT) / SUM(cm.TRUE_POSITIVE_COUNT + cm.FALSE_NEGATIVE_COUNT)
         ELSE NULL END as DETECTION_RATE,
    CASE WHEN SUM(cm.TRUE_POSITIVE_COUNT + cm.FALSE_POSITIVE_COUNT) > 0
         THEN SUM(cm.TRUE_POSITIVE_COUNT) / SUM(cm.TRUE_POSITIVE_COUNT + cm.FALSE_POSITIVE_COUNT)
         ELSE NULL END as PRECISION_RATE

FROM COST_MATRIX cm
LEFT JOIN CONSTRUCTION_GEO_DB.ATOMIC.PROJECT p ON cm.SITE_ID = p.PROJECT_ID
WHERE cm.SITE_ID IS NOT NULL
GROUP BY cm.MODEL_NAME, cm.SITE_ID, p.PROJECT_NAME, cm.PERIOD_TYPE;

-- Portfolio-Level Cost Rollup (All Sites)
CREATE OR REPLACE VIEW V_PORTFOLIO_COST_SUMMARY AS
SELECT 
    MODEL_NAME,
    'PORTFOLIO' as SCOPE,
    PERIOD_TYPE,
    MIN(PERIOD_START) as PERIOD_START,
    MAX(PERIOD_END) as PERIOD_END,
    
    -- Aggregated counts
    SUM(TRUE_POSITIVE_COUNT) as TOTAL_TRUE_POSITIVES,
    SUM(FALSE_POSITIVE_COUNT) as TOTAL_FALSE_POSITIVES,
    SUM(FALSE_NEGATIVE_COUNT) as TOTAL_FALSE_NEGATIVES,
    SUM(TRUE_NEGATIVE_COUNT) as TOTAL_TRUE_NEGATIVES,
    
    -- Portfolio-wide business value
    SUM(TRUE_POSITIVE_VALUE_USD) as PORTFOLIO_SAVINGS_USD,
    SUM(FALSE_POSITIVE_COST_USD) as PORTFOLIO_FP_COSTS_USD,
    SUM(FALSE_NEGATIVE_COST_USD) as PORTFOLIO_FN_COSTS_USD,
    SUM(NET_VALUE_USD) as PORTFOLIO_NET_VALUE_USD,
    
    -- Annualized projection
    SUM(NET_VALUE_USD) * 365 / NULLIF(DATEDIFF('day', MIN(PERIOD_START), MAX(PERIOD_END)), 0) as PROJECTED_ANNUAL_VALUE_USD,
    
    -- Portfolio detection efficiency
    CASE WHEN SUM(TRUE_POSITIVE_COUNT + FALSE_NEGATIVE_COUNT) > 0 
         THEN SUM(TRUE_POSITIVE_COUNT) / SUM(TRUE_POSITIVE_COUNT + FALSE_NEGATIVE_COUNT)
         ELSE NULL END as PORTFOLIO_DETECTION_RATE

FROM COST_MATRIX
GROUP BY MODEL_NAME, PERIOD_TYPE;

-- Optimal Threshold by Site
CREATE OR REPLACE VIEW V_OPTIMAL_THRESHOLDS AS
SELECT 
    pc.MODEL_NAME,
    pc.SITE_ID,
    p.PROJECT_NAME as SITE_NAME,
    pc.PROBABILITY_THRESHOLD as OPTIMAL_THRESHOLD,
    pc.EXPECTED_NET_DAILY_VALUE_USD as EXPECTED_DAILY_VALUE,
    pc.EXPECTED_NET_DAILY_VALUE_USD * 365 as EXPECTED_ANNUAL_VALUE,
    pc.EXPECTED_TP_RATE as DETECTION_RATE_AT_OPTIMAL,
    pc.EXPECTED_FP_RATE as FALSE_ALARM_RATE_AT_OPTIMAL,
    pc.COMPUTED_AT
FROM PROFIT_CURVES pc
LEFT JOIN CONSTRUCTION_GEO_DB.ATOMIC.PROJECT p ON pc.SITE_ID = p.PROJECT_ID
WHERE pc.IS_OPTIMAL_THRESHOLD = TRUE;

-- ============================================================================
-- Summary View: Executive Dashboard
-- ============================================================================

CREATE OR REPLACE VIEW V_EXECUTIVE_ML_VALUE AS
SELECT 
    MODEL_NAME,
    CASE MODEL_NAME
        WHEN 'GHOST_CYCLE_DETECTOR' THEN 'Ghost Cycle Detection'
        WHEN 'CHOKE_POINT_PREDICTOR' THEN 'Choke Point Prediction'
        WHEN 'CYCLE_TIME_OPTIMIZER' THEN 'Cycle Time Optimization'
        ELSE MODEL_NAME
    END as MODEL_DISPLAY_NAME,
    
    -- Current period value
    PORTFOLIO_NET_VALUE_USD as CURRENT_PERIOD_VALUE_USD,
    PROJECTED_ANNUAL_VALUE_USD,
    
    -- Efficiency
    ROUND(PORTFOLIO_DETECTION_RATE * 100, 1) as DETECTION_RATE_PCT,
    
    -- Volume
    TOTAL_TRUE_POSITIVES + TOTAL_FALSE_POSITIVES + TOTAL_FALSE_NEGATIVES + TOTAL_TRUE_NEGATIVES as TOTAL_PREDICTIONS,
    TOTAL_TRUE_POSITIVES as CAUGHT_ISSUES,
    TOTAL_FALSE_NEGATIVES as MISSED_ISSUES,
    
    -- Cost breakdown
    PORTFOLIO_SAVINGS_USD as VALUE_GENERATED,
    PORTFOLIO_FP_COSTS_USD + PORTFOLIO_FN_COSTS_USD as VALUE_LOST

FROM V_PORTFOLIO_COST_SUMMARY
WHERE PERIOD_TYPE = 'MONTHLY';

-- ============================================================================
-- Grant Permissions
-- ============================================================================
GRANT SELECT ON ALL TABLES IN SCHEMA ML TO ROLE PUBLIC;
GRANT SELECT ON ALL VIEWS IN SCHEMA ML TO ROLE PUBLIC;

SELECT 'Cost Matrix Schema created successfully' as STATUS;
