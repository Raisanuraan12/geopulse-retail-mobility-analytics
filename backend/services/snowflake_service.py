import os

import snowflake.connector
from dotenv import load_dotenv

load_dotenv()


def get_snowflake_connection():
    """Create and return a Snowflake database connection."""
    return snowflake.connector.connect(
        account=os.getenv("SNOWFLAKE_ACCOUNT"),
        user=os.getenv("SNOWFLAKE_USER"),
        password=os.getenv("SNOWFLAKE_PASSWORD"),
        warehouse=os.getenv("SNOWFLAKE_WAREHOUSE"),
        database=os.getenv("SNOWFLAKE_DATABASE"),
        schema=os.getenv("SNOWFLAKE_SCHEMA"),
    )


def test_snowflake_connection():
    """Test the configured Snowflake connection."""
    connection = get_snowflake_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT
                CURRENT_DATABASE(),
                CURRENT_SCHEMA(),
                CURRENT_WAREHOUSE()
            """
        )

        database, schema, warehouse = cursor.fetchone()

        return {
            "status": "connected",
            "database": database,
            "schema": schema,
            "warehouse": warehouse,
        }

    finally:
        cursor.close()
        connection.close()


def get_snowflake_mobility_points(limit=1000):
    """Retrieve mobility GPS points from Snowflake."""
    limit = max(1, min(limit, 5000))

    connection = get_snowflake_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT
                DEVICE_ID,
                LATITUDE,
                LONGITUDE,
                PING_TIMESTAMP
            FROM RAW.STG_MOBILITY_PINGS
            ORDER BY PING_TIMESTAMP
            LIMIT %s
            """,
            (limit,)
        )

        rows = cursor.fetchall()

        return [
            {
                "device_id": row[0],
                "latitude": row[1],
                "longitude": row[2],
                "timestamp": row[3].isoformat() if row[3] else None,
            }
            for row in rows
        ]

    finally:
        cursor.close()
        connection.close()


def get_snowflake_stores(limit=100):
    """Retrieve retail store locations from Snowflake."""
    limit = max(1, min(limit, 1000))

    connection = get_snowflake_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT
                STORE_ID,
                STORE_NAME,
                LATITUDE,
                LONGITUDE
            FROM RAW.STG_STORE_LOCATIONS
            ORDER BY STORE_ID
            LIMIT %s
            """,
            (limit,)
        )

        rows = cursor.fetchall()

        return [
            {
                "store_id": row[0],
                "store_name": row[1],
                "latitude": row[2],
                "longitude": row[3],
            }
            for row in rows
        ]

    finally:
        cursor.close()
        connection.close()

def get_snowflake_footfall_visits():
    """Retrieve daily store visit records used for cannibalization analysis."""
    connection = get_snowflake_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT
                STORE_ID,
                STORE_NAME,
                VISIT_DATE,
                DEVICE_ID,
                DWELL_MINUTES,
                VISIT_TYPE
            FROM FCT_FOOTFALL_DAILY
            ORDER BY VISIT_DATE, STORE_ID
            """
        )

        rows = cursor.fetchall()

        return [
            {
                "store_id": row[0],
                "store_name": row[1],
                "visit_date": row[2].isoformat() if row[2] else None,
                "device_id": row[3],
                "dwell_minutes": float(row[4]) if row[4] is not None else 0.0,
                "visit_type": row[5],
            }
            for row in rows
        ]

    finally:
        cursor.close()
        connection.close()
        