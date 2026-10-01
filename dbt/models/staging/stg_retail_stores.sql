with source as (
    -- Use ref() because this is coming from your seeded CSV
    select * from {{ ref('stg_store_locations') }}
),

transformed as (
    select
        cast(store_id as varchar(50)) as store_id,
        
        -- Clean up string artifacts from CSV ingestion
        trim(store_name) as store_name_clean,
        
        -- Generate the spatial point using the latitude and longitude from the CSV
        st_makepoint(longitude, latitude) as geography_point
        
    from source
)

select * from transformed