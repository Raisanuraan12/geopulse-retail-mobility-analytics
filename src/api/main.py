"""
GeoPulse REST API
Exposes processed footfall and mobility analytics to the React/Kepler.gl frontend.

Endpoints:
  GET /health                         - liveness probe
  GET /api/v1/stores                  - list all stores
  GET /api/v1/stores/{store_id}/footfall  - daily footfall metrics for a store
  GET /api/v1/stores/{store_id}/heatmap   - H3 hex heatmap data for a store
  GET /api/v1/cannibalization         - cannibalization pairs report

Run locally:
  uvicorn src.api.main:app --reload --port 8000
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# App & CORS
# ---------------------------------------------------------------------------

app = FastAPI(
    title="GeoPulse Analytics API",
    description="Hyper-local retail mobility analytics REST API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://geopulse.example.com"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class StoreInfo(BaseModel):
    store_id: str
    store_name: str
    latitude: float
    longitude: float
    category: Optional[str] = None


class FootfallSummary(BaseModel):
    store_id: str
    visit_date: date
    total_visits: int
    unique_visitors: int
    avg_dwell_minutes: float
    pass_by_count: int
    short_visit_count: int
    long_visit_count: int


class HexCell(BaseModel):
    h3_index: str
    visit_count: int
    unique_visitors: int


class CannibalizationPair(BaseModel):
    store_a: str
    store_b: str
    distance_km: float
    shared_visitors: int
    jaccard_index: float
    overlap_pct_store_a: float
    overlap_pct_store_b: float


# ---------------------------------------------------------------------------
# Stub data layer (replace with Snowflake connector in production)
# ---------------------------------------------------------------------------

MOCK_STORES: list[StoreInfo] = [
    StoreInfo(store_id="S001", store_name="Connaught Place Flagship", latitude=28.6315, longitude=77.2167, category="Apparel"),
    StoreInfo(store_id="S002", store_name="Rajiv Chowk Metro Hub", latitude=28.6328, longitude=77.2197, category="Electronics"),
    StoreInfo(store_id="S003", store_name="Khan Market Boutique", latitude=28.6003, longitude=77.2274, category="Apparel"),
]


def _get_store_or_404(store_id: str) -> StoreInfo:
    for s in MOCK_STORES:
        if s.store_id == store_id:
            return s
    raise HTTPException(status_code=404, detail=f"Store '{store_id}' not found")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health", tags=["System"])
def health_check():
    """Liveness probe for the API container."""
    return {"status": "ok", "version": app.version}


@app.get("/api/v1/stores", response_model=list[StoreInfo], tags=["Stores"])
def list_stores():
    """Return all registered store locations."""
    return MOCK_STORES


@app.get(
    "/api/v1/stores/{store_id}/footfall",
    response_model=list[FootfallSummary],
    tags=["Footfall"],
)
def get_store_footfall(
    store_id: str,
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
):
    """
    Return daily footfall metrics for a store over a date range.
    Data is sourced from the fct_footfall_daily dbt mart.
    """
    _get_store_or_404(store_id)
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be ≤ end_date")

    # TODO: Replace with Snowflake query against fct_footfall_daily
    return [
        FootfallSummary(
            store_id=store_id,
            visit_date=start_date,
            total_visits=342,
            unique_visitors=289,
            avg_dwell_minutes=18.4,
            pass_by_count=87,
            short_visit_count=164,
            long_visit_count=91,
        )
    ]


@app.get(
    "/api/v1/stores/{store_id}/heatmap",
    response_model=list[HexCell],
    tags=["Heatmap"],
)
def get_store_heatmap(
    store_id: str,
    visit_date: date = Query(..., description="Date for heatmap (YYYY-MM-DD)"),
    resolution: int = Query(9, ge=7, le=12, description="H3 resolution level"),
):
    """
    Return H3 hex cell visit counts for Kepler.gl heatmap rendering.
    """
    _get_store_or_404(store_id)
    # TODO: Query Snowflake H3 aggregation view
    return [
        HexCell(h3_index="89283082837ffff", visit_count=142, unique_visitors=128),
        HexCell(h3_index="8928308280bffff", visit_count=89,  unique_visitors=74),
    ]


@app.get(
    "/api/v1/cannibalization",
    response_model=list[CannibalizationPair],
    tags=["Analytics"],
)
def get_cannibalization_report(
    radius_km: float = Query(2.0, ge=0.1, le=10.0),
    min_overlap_pct: float = Query(5.0, ge=0.0, le=100.0),
):
    """
    Return store pairs with significant visitor overlap within the given radius.
    """
    # TODO: Compute from Snowflake analytics mart
    return [
        CannibalizationPair(
            store_a="S001",
            store_b="S002",
            distance_km=0.34,
            shared_visitors=67,
            jaccard_index=0.18,
            overlap_pct_store_a=23.2,
            overlap_pct_store_b=19.8,
        )
    ]
