with pings as (
    select * from {{ ref('stg_gps_pings') }}
),

daily_activity as (
    select
        device_id,
        date_trunc('day', ping_timestamp_local) as activity_date,
        count(*) as daily_ping_count,
        min(ping_timestamp_local) as first_ping_time,
        max(ping_timestamp_local) as last_ping_time
    from pings
    where geography_point is not null
    group by 1, 2
)

select * from daily_activity
