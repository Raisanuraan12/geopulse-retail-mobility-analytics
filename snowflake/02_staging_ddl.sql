-- ==========================================
-- GeoPulse: Staging Tables DDL
-- ==========================================

USE ROLE GEOPULSE_DEV;
USE DATABASE GEOPULSE_DB;
USE SCHEMA RAW;

-- 1. Table for raw GPS pings (Based on CSV columns)
CREATE OR REPLACE TABLE RAW.STG_MOBILITY_PINGS (
    DEVICE_ID VARCHAR,
    LATITUDE FLOAT,
    LONGITUDE FLOAT,
    PING_TIMESTAMP TIMESTAMP_NTZ,
    GEO_POINT GEOGRAPHY 
);

-- 2. Table for store catchment areas
CREATE OR REPLACE TABLE RAW.STG_STORE_LOCATIONS (
    STORE_ID VARCHAR,
    STORE_NAME VARCHAR,
    LATITUDE FLOAT,
    LONGITUDE FLOAT,
    CATCHMENT_POLYGON GEOGRAPHY
);