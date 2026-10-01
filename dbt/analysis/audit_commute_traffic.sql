-- Validating temporal spikes for morning (7-10 AM) vs evening (4-7 PM) commutes
with hourly_data as (
    select * from {{ ref('fct_hourly_footfall') }}
)

select
    store_name_clean,
    case
        when extract(hour from traffic_hour) between 7 and 10 then 'Morning Commute'
        when extract(hour from traffic_hour) between 16 and 19 then 'Evening Commute'
        else 'Off-Peak'
    end as commute_window,
    sum(total_ping_volume) as total_traffic
from hourly_data
group by 1, 2
order by store_name_clean, commute_window