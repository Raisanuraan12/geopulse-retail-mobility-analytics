-- Custom data test to ensure mathematical soundness
-- Logic: Total unique visitors cannot exceed total ping volume.
-- If this query returns ANY rows, the dbt test fails.

select
    store_id,
    traffic_hour,
    total_unique_visitors,
    total_ping_volume
from {{ ref('fct_hourly_footfall') }}
where total_unique_visitors > total_ping_volume