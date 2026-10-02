-- Custom data test to ensure cannibalization percentages are mathematically possible
-- If this query returns ANY rows, the pipeline will fail.

select
    existing_store_name,
    new_store_name,
    shared_visitors_count,
    total_existing_customers,
    cannibalization_percentage
from {{ ref('fct_store_cannibalization') }}
where cannibalization_percentage < 0 
   or cannibalization_percentage > 100