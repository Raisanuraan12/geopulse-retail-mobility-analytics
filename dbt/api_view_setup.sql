-- 1. Create the Secure View for the Backend API
CREATE OR REPLACE SECURE VIEW GEOPULSE_DB.DBT_RAISA.api_v_hourly_footfall AS
SELECT 
    HOUR(TRAFFIC_HOUR) AS commute_hour, 
    SUM(total_unique_visitors) AS total_visitors
FROM GEOPULSE_DB.DBT_RAISA.fct_hourly_footfall
GROUP BY HOUR(TRAFFIC_HOUR)
ORDER BY commute_hour;

-- 2. Create a dedicated role for the Backend Team (if it doesn't exist)
CREATE ROLE IF NOT EXISTS backend_api_role;

-- 3. Grant basic access to the database and schema
GRANT USAGE ON DATABASE GEOPULSE_DB TO ROLE backend_api_role;
GRANT USAGE ON SCHEMA GEOPULSE_DB.DBT_RAISA TO ROLE backend_api_role;

-- 4. Grant strictly read-only access to the new Secure View
GRANT SELECT ON VIEW GEOPULSE_DB.DBT_RAISA.api_v_hourly_footfall TO ROLE backend_api_role;