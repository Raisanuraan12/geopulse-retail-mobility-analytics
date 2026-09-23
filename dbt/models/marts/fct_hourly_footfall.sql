with spatial_mapping as (
    select * from {{ ref('int_ping_store_mapping') }}
),

hourly_aggregation as (
    select
        store_id,
        store_name_clean,
        
        -- Group the data into 1-hour time blocks
        date_trunc('hour', ping_timestamp_local) as traffic_hour,
        
        -- Calculate total unique visitors by counting distinct devices
        count(distinct device_id) as total_unique_visitors,
        
        -- Calculate total activity volume
        count(device_id) as total_ping_volume
        
    from spatial_mapping
    group by 
        store_id,
        store_name_clean,
        traffic_hour
)

select * from hourly_aggregation