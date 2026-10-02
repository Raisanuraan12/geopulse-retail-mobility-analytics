with pings as (
    select * from {{ ref('stg_gps_pings') }}
),

stores as (
    select * from {{ ref('stg_retail_stores') }}
),

spatial_mapping as (
    select
        p.device_id,
        p.ping_timestamp_local,
        s.store_id,
        s.store_name_clean
        
    from pings p
    join stores s
        -- Spatial Join: Keep pings that fall within 50 meters of the store point
        on st_dwithin(p.geography_point, s.geography_point, 50)
)

select * from spatial_mapping