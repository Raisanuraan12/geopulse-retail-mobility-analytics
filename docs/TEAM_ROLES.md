# GeoPulse – Team Roles & Responsibilities

## Project
**GeoPulse: Hyper-Local Retail Mobility Analytics**

## Team Lead
**Sandip Das**

---

## Member 1 – Team Lead + Backend/API Integration
### Responsibilities
- Coordinate the complete GeoPulse development workflow.
- Manage GitHub repository, branches, pull requests and integration.
- Develop backend/API services required by the dashboard.
- Connect processed geospatial data with the application layer.
- Create APIs for mobility, footfall and store analytics.
- Return processed analytics data as JSON for frontend consumption.
- Perform API and integration testing.
- Coordinate final frontend-backend-data integration.
- Support cloud deployment and final project testing.

---

## Member 2 – Spatial Data Engineering
### Technologies
- Python
- PySpark
- Apache Sedona

### Responsibilities
- Generate anonymized mobile GPS ping data.
- Work with DeviceID, Latitude, Longitude and Timestamp data.
- Configure PySpark and Apache Sedona.
- Perform large-scale spatial joins.
- Create store catchment-area polygons.
- Determine which GPS points intersect store areas.
- Prepare processed spatial datasets for analytics.

---

## Member 3 – Geospatial Data & Analytics
### Technologies
- Snowflake
- Snowpark
- dbt
- SQL

### Responsibilities
- Configure the Snowflake data warehouse.
- Create tables using GEOGRAPHY data types.
- Load raw GPS mobility data.
- Configure dbt with Snowflake.
- Build transformation models.
- Calculate hourly footfall and unique visitor metrics.
- Develop store cannibalization analysis.
- Perform data integrity and analytics validation.

---

## Member 4 – Frontend & Mobility Dashboard
### Technologies
- React
- Kepler.gl

### Responsibilities
- Develop the GeoPulse dashboard using React.
- Integrate Kepler.gl geospatial visualization.
- Build interactive mobility maps.
- Display footfall heatmaps and movement patterns.
- Visualize store catchment areas.
- Implement timeline-based mobility analysis.
- Build 3D H3 Hexagon visualizations.
- Connect frontend components with backend APIs.
- Perform final UI testing and polishing.

---

# Week 4 – Team Integration

All members will collaborate on:

- Apache Airflow automation.
- End-to-end integration.
- Data pipeline testing.
- Dashboard testing.
- Deployment.
- Documentation.
- Final presentation and project review.

---

# GitHub Workflow

- `main` will contain stable integrated code.
- Each member will work on their assigned branch.
- Every member must make at least **one meaningful commit per working day**.
- Changes should be tested before committing.
- Pull requests will be reviewed before important changes are merged into `main`.
- Team Lead will coordinate final integration and resolve merge conflicts.