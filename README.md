# GeoPulse – Hyper-Local Retail Mobility Analytics

## Overview

GeoPulse is a geospatial retail analytics platform designed to analyze anonymized mobile GPS mobility data and provide dynamic insights into footfall patterns, store catchment areas, and retail cannibalization.

The platform helps retail decision-makers evaluate potential store locations using real mobility patterns instead of relying only on static demographic data.

## Core Technologies

- Python
- PySpark
- Apache Sedona
- Snowflake
- Snowpark
- dbt
- React
- Kepler.gl
- Apache Airflow

## Core Modules

### 1. Geospatial Data Lakehouse
Stores and processes anonymized GPS coordinate data using Snowflake and its GEOGRAPHY data types.

### 2. Spatial Transformation
Uses PySpark and Apache Sedona to perform large-scale spatial joins between GPS points and store catchment areas.

### 3. Data Modeling
Uses dbt to transform spatial data into analytics-ready footfall and mobility metrics.

### 4. Mobility Dashboard
Uses React and Kepler.gl to visualize footfall heatmaps, movement patterns, store catchment areas, and mobility analytics.

### 5. Backend/API Integration
Provides an application layer between processed analytics data and the frontend dashboard.

### 6. Pipeline Automation
Uses Apache Airflow to automate spatial processing and transformation workflows.

## Development Workflow

- `main` contains stable integrated code.
- Team members work on assigned development branches.
- At least one meaningful GitHub commit is required per working day.
- Changes are tested before important commits and integration.
- Pull requests are reviewed before major changes are merged into `main`.

## Analytics Lead Contributions (Raisa Nuraan)

### Key Deliverables & Architecture
* **Spatial Data Warehousing (Snowflake):** Architected database schemas, staging environments, and secure read-only views (`api_v_hourly_footfall`) optimized for downstream React application consumption.
* **Analytics Engineering (dbt):** Developed modular data marts to calculate temporal commute spikes (`fct_hourly_footfall`) and shared visitor boundaries (`fct_store_cannibalization`). 
* **Automated Orchestration (Airflow):** Integrated `dbt` transformations into a daily Apache Airflow DAG (`geopulse_daily_pipeline.py`) triggered seamlessly after distributed spatial joins.
* **Data Quality & CI/CD:** Implemented generic and custom `dbt` tests, a Python `pytest` integration suite for strict API schema validation, and post-run `dbt` macros for automated role-based access control (RBAC) grants.
* **3D Geospatial Visualization (Kepler.gl):** Configured JSON parameters to render 3D H3 hexagons and time-series sliders, enabling interactive UI playback of 24-hour foot traffic density.

### Security Protocols
* **Zero-Secrets Policy:** All database credentials, warehouse targets, and API keys are injected dynamically at runtime via environment variables. No plain-text credentials exist in the codebase.
* **Least Privilege Access:** Implemented Snowflake Secure Views to obfuscate underlying data logic, managed by automated post-hook role grants to ensure stable but restricted access for the `backend_api_role`.