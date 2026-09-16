-- ==========================================
-- GeoPulse: Load Data and Spatial Transform
-- ==========================================

USE ROLE GEOPULSE_DEV;
USE DATABASE GEOPULSE_DB;
USE SCHEMA RAW;

-- 1. Load GPS Pings (Transforming Lat/Long into GEOGRAPHY point)
COPY INTO RAW.STG_MOBILITY_PINGS (DEVICE_ID, LATITUDE, LONGITUDE, PING_TIMESTAMP, GEO_POINT)
FROM (
    SELECT 
        $1::VARCHAR, 
        $2::FLOAT, 
        $3::FLOAT, 
        $4::TIMESTAMP_NTZ, 
        ST_POINT($3::FLOAT, $2::FLOAT) -- Note: Snowflake requires ST_POINT(Longitude, Latitude)
    FROM @RAW.GEOPULSE_STAGE/pings/
);

-- 2. Load Store Locations (Assuming column 5 contains WKT Polygon strings)
COPY INTO RAW.STG_STORE_LOCATIONS (STORE_ID, STORE_NAME, LATITUDE, LONGITUDE, CATCHMENT_POLYGON)
FROM (
    SELECT 
        $1::VARCHAR, 
        $2::VARCHAR, 
        $3::FLOAT, 
        $4::FLOAT, 
        TO_GEOGRAPHY($5::VARCHAR)
    FROM @RAW.GEOPULSE_STAGE/stores/
);