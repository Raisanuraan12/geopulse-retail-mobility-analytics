{{ config(materialized='table') }}

with store_mapping as (
    select * from {{ ref('int_ping_store_mapping') }}
),

movement_tracking as (
    select
        device_id,
        ping_timestamp_local as current_ping_time,
        store_name_clean as current_store,
        
        -- Use LAG to find the chronological previous store this device visited
        lag(store_name_clean) over (partition by device_id order by ping_timestamp_local) as previous_store
        
    from store_mapping
),

location_changes as (
    select *
    from movement_tracking
    where previous_store is not null 
      and current_store != previous_store
)

select * from location_changes