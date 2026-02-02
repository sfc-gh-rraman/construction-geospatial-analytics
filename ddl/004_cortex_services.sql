-- ============================================================================
-- GROUNDTRUTH Construction Geospatial Analytics - Cortex AI Services
-- ============================================================================
-- Creates Cortex Search service for document retrieval

USE DATABASE CONSTRUCTION_GEO_DB;
USE SCHEMA CONSTRUCTION_GEO;

-- ============================================================================
-- CORTEX SEARCH SERVICE - Site Documents
-- ============================================================================
-- Create search service for geotechnical reports, safety plans, procedures

CREATE OR REPLACE CORTEX SEARCH SERVICE SITE_DOCUMENTS_SEARCH
    ON RAW.SITE_DOCUMENTS
    WAREHOUSE = CONSTRUCTION_WH
    TARGET_LAG = '1 hour'
AS (
    SELECT 
        document_id,
        site_id,
        title,
        document_type,
        content,
        summary,
        author,
        document_date
    FROM RAW.SITE_DOCUMENTS
);

-- ============================================================================
-- Grant permissions for Cortex Search
-- ============================================================================
GRANT USAGE ON CORTEX SEARCH SERVICE SITE_DOCUMENTS_SEARCH TO ROLE ACCOUNTADMIN;

-- ============================================================================
-- Example: Query the Cortex Search Service
-- ============================================================================
/*
-- Search for documents about compaction
SELECT *
FROM TABLE(
    SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
        'CONSTRUCTION_GEO_DB.CONSTRUCTION_GEO.SITE_DOCUMENTS_SEARCH',
        'soil compaction requirements',
        {
            'columns': ['title', 'summary', 'document_type'],
            'limit': 5
        }
    )
);
*/

-- ============================================================================
-- Cortex Complete Examples
-- ============================================================================
/*
-- Generate summary from document content
SELECT SNOWFLAKE.CORTEX.COMPLETE(
    'mistral-large2',
    'Summarize the following geotechnical report in 3 bullet points:\n\n' || content
) as summary
FROM RAW.SITE_DOCUMENTS
WHERE document_type = 'geotech'
LIMIT 1;

-- Generate morning briefing
SELECT SNOWFLAKE.CORTEX.COMPLETE(
    'mistral-large2',
    CONCAT(
        'Generate a construction site morning briefing based on this data:\n',
        '- Ghost Cycles detected: 3\n',
        '- Choke Points: 2 (Stockpile B, North Road)\n',
        '- Volume progress: 87%\n',
        '- Equipment active: 42/48\n',
        '\nProvide watch points and recommendations.'
    )
) as briefing;
*/
