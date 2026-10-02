{{
  config(
    materialized='view',
    tags=['staging', 'gps']
  )
}}

/*
  Model: stg_gps_ping_store_joins
  Description: Staging view that cleans and standardises the raw GPS
               ping-to-store join output before it is consumed by marts.

  ── Upstream source ───────────────────────────────────────────────────────
  Table : GEOPULSE_DB.RAW.GPS_PING_STORE_JOINS
  Writer: src/spatial/spatial_transform.py  →  write_joins_to_snowflake()
          Called by the Airflow task `run_spatial_transform` in
          airflow/dags/geopulse_daily_pipeline.py after the Sedona spatial
          join step (sedona_spatial_join_catchments) completes.

  ── Schema contract ───────────────────────────────────────────────────────
  Column         Snowflake type   Description
  ─────────────────────────────────────────────────────────────────────────
  PING_ID        NUMBER           Synthetic monotonically-increasing ping
                                  identifier (Spark monotonically_increasing_id).
                                  Not globally unique across pipeline runs;
                                  use (DEVICE_ID, TIMESTAMP_RAW, STORE_ID) as
                                  a natural composite key if deduplication is needed.
  DEVICE_ID      VARCHAR(64)      Anonymised device identifier (from raw CSV).
  STORE_ID       VARCHAR(32)      Store identifier from the store locations config.
  STORE_NAME     VARCHAR(128)     Human-readable store name.
  TIMESTAMP_RAW  VARCHAR          ISO-8601 timestamp string from the GPS ping CSV.
  H3_INDEX       VARCHAR(20)      H3 cell ID at resolution 9 for the ping location.
  DISTANCE_KM    FLOAT            Great-circle distance (km) between the GPS ping
                                  and the store centroid, computed by Sedona
                                  ST_DistanceSphere (accurate sphere model).
  INGESTED_AT    TIMESTAMP_NTZ    UTC timestamp when write_joins_to_snowflake()
                                  wrote the record into this table.

  ── Grain ─────────────────────────────────────────────────────────────────
  One row per (ping_id, store_id).  A single GPS ping can match at most one
  store in the current implementation (nearest within radius_km = 1.0 km).
  ──────────────────────────────────────────────────────────────────────────

  Owner: shubhamgawari64
*/

with

source as (
    select * from {{ source('geopulse_raw', 'gps_ping_store_joins') }}
),

renamed as (
    select
        -- identifiers
        ping_id::number                          as ping_id,
        device_id::varchar(64)                   as device_id,
        store_id::varchar(32)                    as store_id,
        store_name::varchar(128)                 as store_name,

        -- spatial
        h3_index::varchar(20)                    as h3_index,
        distance_km::float                       as distance_km,

        -- temporal
        try_to_timestamp_ntz(timestamp_raw)      as timestamp,

        -- metadata
        ingested_at::timestamp_ntz               as ingested_at

    from source
    where
        device_id is not null
        and store_id is not null
        and try_to_timestamp_ntz(timestamp_raw) is not null
)

select * from renamed
