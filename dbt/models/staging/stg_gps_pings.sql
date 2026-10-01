with source as (
    select * from {{ source('geopulse_raw', 'STG_MOBILITY_PINGS') }}
),

transformed as (
    select
        cast(device_id as varchar(50)) as device_id,
        
        -- Fixed: Referencing the correct raw column name "timestamp"
        convert_timezone('UTC', 'Asia/Kolkata', cast(timestamp as timestamp_ntz)) as ping_timestamp_local,
        
        cast(latitude as float) as latitude,
        cast(longitude as float) as longitude,
        
        -- Fixed: Generating the spatial point from coordinates
        ST_MAKEPOINT(cast(longitude as float), cast(latitude as float)) as geography_point
        
    from source
)

select * from transformed