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
  Source: RAW.GEOPULSE.GPS_PING_STORE_JOINS (Snowflake)
  Owner: shubhamgawari64
*/

with

source as (
    select * from {{ source('geopulse_raw', 'gps_ping_store_joins') }}
),

renamed as (
    select
        -- identifiers
        device_id::varchar(64)                   as device_id,
        store_id::varchar(32)                    as store_id,
        store_name::varchar(128)                 as store_name,

        -- spatial
        h3_index::varchar(20)                    as h3_index,

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
