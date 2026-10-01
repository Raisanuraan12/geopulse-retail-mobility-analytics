with daily_activity as (
    select * from {{ ref('int_device_daily_activity') }}
),

final_mart as (
    select
        activity_date,
        count(distinct device_id) as total_active_devices,
        sum(daily_ping_count) as total_daily_pings,
        avg(daily_ping_count) as avg_pings_per_device
    from daily_activity
    group by 1
    order by activity_date desc
)

select * from final_mart