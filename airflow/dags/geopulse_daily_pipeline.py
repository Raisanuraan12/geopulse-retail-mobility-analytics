"""
Airflow DAG: geopulse_daily_pipeline
Orchestrates the full daily GeoPulse data pipeline:
  1. Ingest raw GPS pings from object storage
  2. Run spatial transformation (H3 binning + Sedona catchment join)
  3. Write join results to GEOPULSE_DB.RAW.GPS_PING_STORE_JOINS (Snowflake)
  4. Trigger dbt models to refresh analytics marts
  5. Send pipeline status notification

Schedule: Daily at 02:00 UTC (data lags ~2 h after midnight)
Owner: shubhamgawari64
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.utils.dates import days_ago

# ---------------------------------------------------------------------------
# Default arguments
# ---------------------------------------------------------------------------

DEFAULT_ARGS = {
    "owner": "shubhamgawari64",
    "depends_on_past": False,
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=10),
    "execution_timeout": timedelta(hours=2),
}

# ---------------------------------------------------------------------------
# Task callables
# ---------------------------------------------------------------------------


def ingest_gps_pings(**context) -> None:
    """Pull yesterday's GPS ping files from cloud storage and validate them."""
    from src.ingestion.gps_ingestion import load_gps_csv, save_as_json

    ds = context["ds"]  # YYYY-MM-DD execution date
    source_path = f"/data/raw/gps_pings_{ds}.csv"
    output_path = f"/data/validated/gps_pings_{ds}.json"

    records = load_gps_csv(source_path)
    save_as_json(records, output_path)
    context["ti"].xcom_push(key="record_count", value=len(records))


def run_spatial_transform(**context) -> None:
    """
    H3-bin GPS pings, perform a real distributed Sedona spatial join against
    store catchments, and write the result to Snowflake.

    Upstream sources read:
        /data/validated/gps_pings_{ds}.json  (from ingest_gps_pings task)
        /data/config/store_locations.json    (shared store config)

    Downstream target written:
        GEOPULSE_DB.RAW.GPS_PING_STORE_JOINS  (Snowflake)
        — this is the upstream source for stg_gps_ping_store_joins.sql

    Schema of the written table:
        ping_id       NUMBER          Synthetic monotonic ping identifier
        device_id     VARCHAR(64)     Anonymised device identifier
        store_id      VARCHAR(32)     Matched store identifier
        store_name    VARCHAR(128)    Human-readable store name
        timestamp_raw VARCHAR         ISO-8601 GPS ping timestamp string
        h3_index      VARCHAR(20)     H3 cell ID at resolution 9
        distance_km   FLOAT           Haversine distance ping→store centroid (km)
        ingested_at   TIMESTAMP_NTZ   Pipeline write timestamp (UTC)

    Snowflake credentials are read from environment variables:
        SF_ACCOUNT, SF_USER, SF_PASSWORD, SF_DATABASE (default GEOPULSE_DB),
        SF_SCHEMA  (default RAW), SF_WAREHOUSE (optional), SF_ROLE (optional).
    """
    import json
    from src.spatial.spatial_transform import (
        bin_pings_to_h3,
        sedona_spatial_join_catchments,
        write_joins_to_snowflake,
    )

    ds = context["ds"]
    with open(f"/data/validated/gps_pings_{ds}.json") as f:
        pings = json.load(f)

    # Load store locations from shared config
    with open("/data/config/store_locations.json") as f:
        stores = json.load(f)

    # Step 1 — H3 binning (unchanged logic)
    enriched = bin_pings_to_h3(pings)

    # Step 2 — Real Sedona distributed spatial join
    #   sedona_spatial_join_catchments returns a Spark DataFrame; no Python
    #   loop or bounding-box approximation is involved.
    spark_df = sedona_spatial_join_catchments(enriched, stores, radius_km=1.0)

    # Step 3 — Write to Snowflake so stg_gps_ping_store_joins.sql has a real
    #   upstream source.  Credentials come from environment variables.
    sf_conn_params = {
        "account":   os.environ["SF_ACCOUNT"],
        "user":      os.environ["SF_USER"],
        "password":  os.environ["SF_PASSWORD"],
        "database":  os.environ.get("SF_DATABASE", "GEOPULSE_DB"),
        "schema":    os.environ.get("SF_SCHEMA", "RAW"),
    }
    if os.environ.get("SF_WAREHOUSE"):
        sf_conn_params["warehouse"] = os.environ["SF_WAREHOUSE"]
    if os.environ.get("SF_ROLE"):
        sf_conn_params["role"] = os.environ["SF_ROLE"]

    nrows = write_joins_to_snowflake(spark_df, sf_conn_params)

    # Step 4 — Also persist local JSON for downstream compatibility / auditing
    output_path = f"/data/joined/ping_store_joins_{ds}.json"
    with open(output_path, "w") as f:
        json.dump(spark_df.toPandas().to_dict(orient="records"), f)

    context["ti"].xcom_push(key="join_count", value=nrows)



# ---------------------------------------------------------------------------
# DAG definition
# ---------------------------------------------------------------------------

with DAG(
    dag_id="geopulse_daily_pipeline",
    description="Daily GPS ingestion → spatial transform → dbt analytics refresh",
    default_args=DEFAULT_ARGS,
    schedule_interval="0 2 * * *",
    start_date=days_ago(1),
    catchup=False,
    max_active_runs=1,
    tags=["geopulse", "daily", "geospatial"],
) as dag:

    t_ingest = PythonOperator(
        task_id="ingest_gps_pings",
        python_callable=ingest_gps_pings,
    )

    t_spatial = PythonOperator(
        task_id="run_spatial_transform",
        python_callable=run_spatial_transform,
    )

    t_dbt_run = BashOperator(
        task_id="dbt_run_footfall",
        bash_command=(
            "cd /opt/geopulse/dbt && "
            "dbt run --select fct_footfall_daily --target prod"
        ),
    )

    t_dbt_test = BashOperator(
        task_id="dbt_test_footfall",
        bash_command=(
            "cd /opt/geopulse/dbt && "
            "dbt test --select fct_footfall_daily --target prod"
        ),
    )

    # Pipeline dependency chain
    t_ingest >> t_spatial >> t_dbt_run >> t_dbt_test
