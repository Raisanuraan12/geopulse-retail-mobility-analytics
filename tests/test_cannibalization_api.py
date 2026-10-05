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
    cannibalization_records = [
        {
            "existing_store_name": "GeoPulse Store 053",
            "new_store_name": "GeoPulse Store 100",
            "shared_visitors_count": 1,
            "total_existing_customers": 1,
            "cannibalization_percentage": 100.0,
        },
        {
            "existing_store_name": "GeoPulse Store 032",
            "new_store_name": "GeoPulse Store 041",
            "shared_visitors_count": 1,
            "total_existing_customers": 1,
            "cannibalization_percentage": 100.0,
        },
    ]

    monkeypatch.setattr(
        snowflake_router,
        "get_snowflake_cannibalization",
        lambda: cannibalization_records,
    )

    response = client.get("/snowflake/cannibalization")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "success"
    assert data["source"] == "snowflake"
    assert data["count"] == 2
    assert data["pairs"] == cannibalization_records

    pair = data["pairs"][0]

    assert pair["existing_store_name"] == "GeoPulse Store 053"
    assert pair["new_store_name"] == "GeoPulse Store 100"
    assert pair["shared_visitors_count"] == 1
    assert pair["total_existing_customers"] == 1
    assert pair["cannibalization_percentage"] == 100.0


def test_cannibalization_returns_empty_result(monkeypatch):
    monkeypatch.setattr(
        snowflake_router,
        "get_snowflake_cannibalization",
        lambda: [],
    )

    response = client.get("/snowflake/cannibalization")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "success"
    assert data["source"] == "snowflake"
    assert data["count"] == 0
    assert data["pairs"] == []


def test_cannibalization_handles_snowflake_failure(monkeypatch):
    def raise_snowflake_error():
        raise RuntimeError("Snowflake unavailable")

    monkeypatch.setattr(
        snowflake_router,
        "get_snowflake_cannibalization",
        raise_snowflake_error,
    )

    response = client.get("/snowflake/cannibalization")

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Snowflake cannibalization data unavailable"
    )
