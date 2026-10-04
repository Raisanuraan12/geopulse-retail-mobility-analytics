import os
import sys

from fastapi.testclient import TestClient

REPO_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)
BACKEND_DIR = os.path.join(REPO_ROOT, "backend")

if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from backend.main import app
import routers.snowflake as snowflake_router


client = TestClient(app)


def test_cannibalization_endpoint(monkeypatch):
    visits = [
        {
            "store_id": "STORE_A",
            "store_name": "Store A",
            "visit_date": "2026-09-08",
            "device_id": "DEVICE_001",
            "dwell_minutes": 15.0,
            "visit_type": "short_visit",
        },
        {
            "store_id": "STORE_A",
            "store_name": "Store A",
            "visit_date": "2026-09-08",
            "device_id": "DEVICE_002",
            "dwell_minutes": 20.0,
            "visit_type": "short_visit",
        },
        {
            "store_id": "STORE_B",
            "store_name": "Store B",
            "visit_date": "2026-09-08",
            "device_id": "DEVICE_002",
            "dwell_minutes": 25.0,
            "visit_type": "short_visit",
        },
        {
            "store_id": "STORE_B",
            "store_name": "Store B",
            "visit_date": "2026-09-08",
            "device_id": "DEVICE_003",
            "dwell_minutes": 35.0,
            "visit_type": "long_visit",
        },
    ]

    stores = [
        {
            "store_id": "STORE_A",
            "store_name": "Store A",
            "latitude": 18.5204,
            "longitude": 73.8567,
        },
        {
            "store_id": "STORE_B",
            "store_name": "Store B",
            "latitude": 18.5210,
            "longitude": 73.8570,
        },
    ]

    monkeypatch.setattr(
        snowflake_router,
        "get_snowflake_footfall_visits",
        lambda: visits,
    )

    monkeypatch.setattr(
        snowflake_router,
        "get_snowflake_stores",
        lambda limit=1000: stores,
    )

    response = client.get(
        "/snowflake/cannibalization",
        params={
            "radius_km": 2.0,
            "min_overlap_pct": 5.0,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "success"
    assert data["source"] == "snowflake"
    assert data["count"] == 1

    pair = data["pairs"][0]

    assert pair["store_a"] == "STORE_A"
    assert pair["store_b"] == "STORE_B"
    assert pair["shared_visitors"] == 1
    assert pair["jaccard_index"] > 0
    assert pair["overlap_pct_store_a"] > 0
    assert pair["overlap_pct_store_b"] > 0

def test_cannibalization_rejects_invalid_radius():
    response = client.get(
        "/snowflake/cannibalization",
        params={"radius_km": -1},
    )

    assert response.status_code == 422

def test_cannibalization_rejects_invalid_overlap_percentage():
    response = client.get(
        "/snowflake/cannibalization",
        params={"min_overlap_pct": 101},
    )

    assert response.status_code == 422
