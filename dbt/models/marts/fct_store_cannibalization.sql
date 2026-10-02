{{ config(materialized='table') }}

with location_changes as (
    select * from {{ ref('int_device_location_tracking') }}
),

store_totals as (
    select 
        previous_store, 
        count(distinct device_id) as total_existing_customers
    from location_changes
    group by 1
),

shared_traffic as (
    select
        previous_store as existing_store_name,
        current_store as new_store_name,
        count(distinct device_id) as shared_visitors_count
    from location_changes
    group by 1, 2
)

select
    s.existing_store_name,
    s.new_store_name,
    s.shared_visitors_count,
    t.total_existing_customers,
    round((s.shared_visitors_count * 100.0) / t.total_existing_customers, 2) as cannibalization_percentage
from shared_traffic s
join store_totals t on s.existing_store_name = t.previous_store
order by cannibalization_percentage desc