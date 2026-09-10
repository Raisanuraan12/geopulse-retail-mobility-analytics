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

## Project Status

🚧 Development in Progress