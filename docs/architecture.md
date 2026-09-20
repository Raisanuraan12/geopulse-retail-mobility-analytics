# GeoPulse – System Architecture

## Overview

GeoPulse is a hyper-local retail mobility analytics platform. It ingests
anonymised GPS mobility data, performs spatial analytics, and surfaces
footfall KPIs to retail decision-makers through an interactive dashboard.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                                     │
│  Mobile SDK pings (CSV / Parquet)  ·  Store location config (JSON)      │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     INGESTION LAYER  (Python)                            │
│  src/ingestion/gps_ingestion.py                                          │
│  • Validates lat/lon bounds, accuracy threshold, timestamp format        │
│  • Outputs clean JSON to /data/validated/                                │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  SPATIAL TRANSFORM LAYER  (Python + H3)                  │
│  src/spatial/spatial_transform.py                                        │
│  • H3 hex-binning at resolution 9 (~174 m cells)                        │
│  • Bounding-box catchment join (store radius configurable)               │
│  • Outputs ping-store join records to /data/joined/                      │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   DATA WAREHOUSE  (Snowflake)                            │
│  RAW.GEOPULSE.GPS_PING_STORE_JOINS  (raw landing)                       │
│  ANALYTICS.GEOPULSE.FCT_FOOTFALL_DAILY  (dbt mart)                     │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  DATA MODELLING LAYER  (dbt)                             │
│  dbt/models/staging/stg_gps_ping_store_joins.sql  → view                │
│  dbt/models/marts/fct_footfall_daily.sql          → incremental table   │
│  Tests: not_null, unique, accepted_values, relationships                 │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  ANALYTICS LAYER  (Python)                               │
│  src/analytics/footfall_metrics.py                                       │
│  • Daily visitor aggregation, dwell time, visit frequency                │
│  • Cannibalization overlap (Jaccard index + shared visitor %)            │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    API LAYER  (FastAPI)                                  │
│  src/api/main.py                                                         │
│  GET /api/v1/stores                 – store directory                   │
│  GET /api/v1/stores/{id}/footfall   – daily footfall KPIs               │
│  GET /api/v1/stores/{id}/heatmap    – H3 hex cells for Kepler.gl        │
│  GET /api/v1/cannibalization        – overlap report                    │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND  (React + Kepler.gl)                          │
│  frontend/src/components/FootfallDashboard.jsx                           │
│  • Store selector, KPI cards, visit type bar chart                       │
│  • Kepler.gl H3 heatmap layer                                            │
└──────────────────────────────────────────────────────────────────────────┘

          All steps orchestrated by Apache Airflow
          airflow/dags/geopulse_daily_pipeline.py  (cron: 02:00 UTC daily)
```

---

## Component Ownership

| Component              | Owner              | Stack                        |
|------------------------|--------------------|------------------------------|
| GPS Ingestion          | shubhamgawari64    | Python, csv, pathlib         |
| Spatial Transform      | shubhamgawari64    | Python, H3, math             |
| dbt Staging Model      | shubhamgawari64    | dbt, Snowflake SQL           |
| dbt Footfall Mart      | shubhamgawari64    | dbt, Snowflake SQL           |
| Footfall Analytics     | shubhamgawari64    | Python                       |
| FastAPI Backend        | shubhamgawari64    | FastAPI, Pydantic            |
| React Dashboard        | shubhamgawari64    | React, Recharts, Kepler.gl   |
| Airflow DAG            | shubhamgawari64    | Apache Airflow               |

---

## Key Design Decisions

### H3 Resolution 9
Resolution 9 gives ~174 m edge-length hexagons, providing granularity
suitable for distinguishing adjacent retail units in dense urban areas
without generating excessive cells.

### Incremental dbt Model
`fct_footfall_daily` uses an incremental strategy keyed on `visit_key`
(surrogate of device + store + date). This avoids full-table recomputation
and keeps daily refresh times under 5 minutes.

### Bounding-Box Catchment (Phase 1)
The bounding-box approximation is fast and parameter-free, sufficient for
Phase 1. Phase 2 will replace it with true geodesic polygon containment
using Apache Sedona's ST_Contains function in PySpark.

### Jaccard Index for Cannibalization
Jaccard index (|A∩B| / |A∪B|) normalises overlap by total audience size,
making it stable when stores have very different visitor volumes.
