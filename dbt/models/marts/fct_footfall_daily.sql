{{
  config(
    materialized='incremental',
    unique_key='visit_key',
    on_schema_change='sync_all_columns',
    cluster_by=['visit_date', 'store_id'],
    tags=['footfall', 'daily']
  )
}}

/*
  Model: fct_footfall_daily
  Description: Daily aggregated footfall counts per store derived from
               validated GPS ping-to-store spatial join results.
  Grain: One row per store per day per unique device (visit).
  Owner: shubhamgawari64
*/

with

ping_store_joins as (
    select
        device_id,
        store_id,
        store_name,
        h3_index,
        timestamp::date                          as visit_date,
        timestamp::time                          as visit_time,
        {{ dbt_utils.generate_surrogate_key([
            'device_id', 'store_id', "timestamp::date"
        ]) }}                                    as visit_key
    from {{ ref('stg_gps_ping_store_joins') }}
    {% if is_incremental() %}
    where timestamp::date > (select max(visit_date) from {{ this }})
    {% endif %}
),

daily_visits as (
    select
        visit_key,
        store_id,
        store_name,
        visit_date,
        device_id,
        h3_index,
        min(visit_time)                          as first_seen,
        max(visit_time)                          as last_seen,
        datediff('minute',
            min(visit_time),
            max(visit_time))                     as dwell_minutes
    from ping_store_joins
    group by 1, 2, 3, 4, 5, 6
),

enriched as (
    select
        dv.*,
        case
            when dwell_minutes < 5  then 'pass_by'
            when dwell_minutes < 30 then 'short_visit'
            else                         'long_visit'
        end                                      as visit_type
    from daily_visits dv
)

select * from enriched
