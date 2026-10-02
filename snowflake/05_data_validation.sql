-- ==========================================
-- GeoPulse: Basic Data Validation
-- ==========================================

USE ROLE GEOPULSE_DEV;
USE DATABASE GEOPULSE_DB;
USE SCHEMA RAW;

-- 1. Check total record counts (ensure all rows loaded)
SELECT 'Pings' AS TABLE_NAME, COUNT(*) AS TOTAL_RECORDS FROM RAW.STG_MOBILITY_PINGS
UNION ALL
SELECT 'Stores', COUNT(*) FROM RAW.STG_STORE_LOCATIONS;

-- 2. Identify missing or null spatial points
SELECT 
    COUNT(*) AS TOTAL_MISSING_POINTS 
FROM RAW.STG_MOBILITY_PINGS 
WHERE GEO_POINT IS NULL;

-- 3. Validate GEOGRAPHY format and preview data
SELECT 
    DEVICE_ID, 
    PING_TIMESTAMP, 
    ST_ASWKT(GEO_POINT) AS GEOMETRY_TEXT -- Converts the geography object to readable text
FROM RAW.STG_MOBILITY_PINGS 
LIMIT 10;