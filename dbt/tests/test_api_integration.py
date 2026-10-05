import os
import snowflake.connector
import pytest

# 1. Establish the Snowflake Connection
@pytest.fixture(scope="module")
def snowflake_conn():
    conn = snowflake.connector.connect(
        user=os.environ.get("SF_USER"),
        password=os.environ.get("SF_PASSWORD"),
        account=os.environ.get("SF_ACCOUNT"),
        warehouse=os.environ.get("SF_WAREHOUSE"), # Added for compute
        database="GEOPULSE_DB",
        schema="DBT_RAISA"
    )
    yield conn
    conn.close()

# 2. Test if the API View exists and is accessible
def test_api_view_exists(snowflake_conn):
    cursor = snowflake_conn.cursor()
    cursor.execute("SHOW VIEWS LIKE 'api_v_hourly_footfall'")
    result = cursor.fetchall()
    assert len(result) > 0, "Integration Check Failed: The API view does not exist in Snowflake."

# 3. Test for exact schema matching (Preventing UI crashes)
def test_api_schema_contract(snowflake_conn):
    cursor = snowflake_conn.cursor()
    cursor.execute("SELECT * FROM api_v_hourly_footfall LIMIT 1")
    
    # Extract the column names returned by Snowflake
    columns = [col[0].lower() for col in cursor.description]
    
    # Assert they exactly match what the Backend API expects
    assert "commute_hour" in columns, "Schema Mismatch: 'commute_hour' column is missing."
    assert "total_visitors" in columns, "Schema Mismatch: 'total_visitors' column is missing."

# 4. Test that the pipeline actually delivered data
def test_data_population(snowflake_conn):
    cursor = snowflake_conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM api_v_hourly_footfall")
    row_count = cursor.fetchone()[0]
    
    assert row_count > 0, "Data Alert: The pipeline ran, but the API view is completely empty."