# GeoPulse: Snowflake Data Warehouse Architecture

## 📌 Overview
This directory contains the proposed Data Definition Language (DDL) and Data Manipulation Language (DML) scripts for setting up the Snowflake environment for the **GeoPulse Hyper-Local Retail Mobility Analytics** project. 

## 🏗️ Architecture Hierarchy
The proposed environment follows a standard multi-layer architecture optimized for geospatial queries:

* **Warehouse:** `GEOPULSE_WH` (Configured for analytical and spatial workloads)
* **Database:** `GEOPULSE_DB`
* **Schema:** `RAW` (Dedicated schema for raw, untransformed data ingestion)

## 🗄️ Staging Tables Structure
The staging layer is designed to ingest raw CSV data directly into Snowflake. To support advanced mobility tracking, spatial coordinates are natively cast to Snowflake's `GEOGRAPHY` data type.

| Table Name | Description | Key Geospatial Feature |
|---|---|---|
| `staging_retail_stores` | Master data for retail store locations and metadata | Point geometries (`GEOGRAPHY`) for storefronts |
| `staging_gps_pings` | High-frequency mobility data representing user locations | Point geometries (`GEOGRAPHY`) for user pings |

## 🚀 Execution Order
The SQL scripts in this directory are designed to be executed sequentially once the live Snowflake environment is provisioned by the Team Lead:

1. **`01_environment_setup.sql`**: Provisions the Warehouse, Database, Schema, and standard CSV file formats.
2. **`02_staging_ddl.sql`**: Defines the schemas for the two main staging tables.
3. **`03_storage_integration.sql`**: Configures the internal stage (`geopulse_internal_stage`).
4. **`04_data_ingestion.sql`**: Executes the `COPY INTO` commands to load raw CSV data into staging.
5. **`05_data_validation.sql`**: Runs initial QA checks (row counts, null checks, spatial boundary validation).

## 🔒 Security Note
In accordance with our team's security policies, **no active database credentials, account identifiers, or secrets are stored in this repository**. Live connections and authentication will be managed securely once the shared Snowflake workspace is finalized.