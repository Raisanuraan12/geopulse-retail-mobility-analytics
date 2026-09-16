-- ==========================================
-- GeoPulse: Internal Stage Creation
-- ==========================================

USE ROLE GEOPULSE_DEV;
USE DATABASE GEOPULSE_DB;
USE SCHEMA RAW;

-- Create Internal Stage linking to the CSV format
CREATE OR REPLACE STAGE RAW.GEOPULSE_STAGE
    FILE_FORMAT = RAW.CSV_FORMAT
    COMMENT = 'Internal stage for GeoPulse raw CSV data ingestion';