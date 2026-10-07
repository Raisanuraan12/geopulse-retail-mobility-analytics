{% macro grant_api_access() %}
    {% set grant_query %}
        GRANT USAGE ON SCHEMA {{ target.schema }} TO ROLE backend_api_role;
        GRANT SELECT ON ALL VIEWS IN SCHEMA {{ target.schema }} TO ROLE backend_api_role;
        GRANT SELECT ON ALL TABLES IN SCHEMA {{ target.schema }} TO ROLE backend_api_role;
    {% endset %}

    {% do run_query(grant_query) %}
    {{ log("Successfully granted read access to backend_api_role", info=True) }}
{% endmacro %}