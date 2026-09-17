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