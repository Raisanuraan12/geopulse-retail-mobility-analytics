with source as (
    select * from {{ source('geopulse_raw', 'STG_STORE_LOCATIONS') }}
),

transformed as (
    select
        cast(store_id as varchar(50)) as store_id,
        
        -- Clean up string artifacts from CSV ingestion
        trim(store_name) as store_name_clean,
        
        -- Aliasing to geography_point for downstream spatial joins
        catchment_polygon as geography_point
        
    from source
)

select * from transformed