"""
Airflow DAG: geopulse_daily_pipeline
Orchestrates the full daily GeoPulse data pipeline:
  1. Ingest raw GPS pings from object storage
  2. Run spatial transformation (H3 binning + catchment join)
  3. Trigger dbt models to refresh analytics marts
  4. Send pipeline status notification

Schedule: Daily at 02:00 UTC (data lags ~2 h after midnight)
Owner: shubhamgawari64
"""

from __future__ import annotations

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
    """H3-bin pings and join them to store catchments."""
    import json
    from src.spatial.spatial_transform import bin_pings_to_h3, spatial_join_catchments

    ds = context["ds"]
    with open(f"/data/validated/gps_pings_{ds}.json") as f:
        pings = json.load(f)

    # Load store locations from shared config
    with open("/data/config/store_locations.json") as f:
        stores = json.load(f)

    enriched = bin_pings_to_h3(pings)
    joined = spatial_join_catchments(enriched, stores, radius_km=1.0)

    output_path = f"/data/joined/ping_store_joins_{ds}.json"
    with open(output_path, "w") as f:
        json.dump(joined, f)

    context["ti"].xcom_push(key="join_count", value=len(joined))


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
