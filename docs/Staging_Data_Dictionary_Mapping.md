# GeoPulse: Raw Ingestion to dbt Staging Mapping
**Purpose:** Architectural bridge connecting Week 1 Snowflake ingestion to Week 2 dbt transformations.

This document maps the untransformed data in the `RAW` schema to the first layer of dbt staging models.

## 1. Mobility Pings Dataset
*   **Week 1 Source:** `GEOPULSE_DB.RAW.staging_gps_pings`
*   **Week 2 dbt Model:** `stg_gps_pings.sql`
*   **Transformation Logic:** The base model handles data type casting, converts timestamps from UTC to IST, and utilizes spatial functions to generate points. This prepares the high-frequency mobility data for downstream daily device activity aggregations.

## 2. Retail Stores Dataset
*   **Week 1 Source:** `GEOPULSE_DB.RAW.staging_retail_stores`
*   **Week 2 dbt Model:** `stg_retail_stores.sql`
*   **Transformation Logic:** The base model standardizes text/string formats and prepares the store schemas for spatial point geometries.

**Downstream Dependencies:**
Once staged, these cleaned models will feed directly into intermediate spatial joins mapping individual GPS points to 50-meter store catchment polygons (`int_ping_store_mapping.sql`).