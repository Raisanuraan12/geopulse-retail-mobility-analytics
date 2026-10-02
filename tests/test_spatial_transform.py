"""
Unit tests for src/spatial/spatial_transform.py

Covers:
    - Existing bounding-box helpers (point_in_bbox, spatial_join_catchments)
    - New Sedona guard: sedona_spatial_join_catchments raises RuntimeError
      when PySpark / Sedona are not installed.
    - write_joins_to_snowflake raises RuntimeError when spark_df is None.

Run with: pytest tests/test_spatial_transform.py -v
"""

from __future__ import annotations

import sys
import os
import importlib
import types
import pytest

# Ensure repo root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.spatial.spatial_transform import (
    point_in_bbox,
    spatial_join_catchments,
    bin_pings_to_h3,
    sedona_spatial_join_catchments,
    write_joins_to_snowflake,
    SEDONA_AVAILABLE,
)


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

STORE_NYC = {
    "store_id": "S001",
    "store_name": "NYC Flagship",
    "latitude": 40.7580,
    "longitude": -73.9855,
}

STORE_BROOKLYN = {
    "store_id": "S002",
    "store_name": "Brooklyn Branch",
    "latitude": 40.6892,
    "longitude": -73.9442,
}


def _make_ping(lat: float, lon: float, device_id: str = "dev_001") -> dict:
    return {
        "device_id": device_id,
        "latitude": lat,
        "longitude": lon,
        "timestamp": "2024-06-15T08:30:00",
        "accuracy_meters": 10.0,
    }


# ---------------------------------------------------------------------------
# point_in_bbox tests (existing helper — must remain intact)
# ---------------------------------------------------------------------------

class TestPointInBbox:
    """Verify the bounding-box helper still works correctly after the refactor."""

    _bbox = {"min_lat": 40.0, "max_lat": 41.0, "min_lon": -74.0, "max_lon": -73.0}

    def test_point_inside(self):
        assert point_in_bbox(40.5, -73.5, self._bbox) is True

    def test_point_outside_lat(self):
        assert point_in_bbox(42.0, -73.5, self._bbox) is False

    def test_point_outside_lon(self):
        assert point_in_bbox(40.5, -75.0, self._bbox) is False

    def test_point_on_boundary(self):
        # Boundary is inclusive (<=)
        assert point_in_bbox(40.0, -74.0, self._bbox) is True

    def test_point_exactly_outside_boundary(self):
        assert point_in_bbox(39.9999, -73.5, self._bbox) is False


# ---------------------------------------------------------------------------
# spatial_join_catchments tests (existing bounding-box function — must remain intact)
# ---------------------------------------------------------------------------

class TestSpatialJoinCatchments:
    """
    The original bounding-box join is preserved as-is.
    These tests confirm its behaviour is unchanged after the Sedona code was added.
    """

    def test_ping_within_radius_is_matched(self):
        # Place ping ~0.05 km from NYC store — well within 1 km
        ping = _make_ping(40.7585, -73.9860)
        results = spatial_join_catchments([ping], [STORE_NYC], radius_km=1.0)
        assert len(results) == 1
        assert results[0]["store_id"] == "S001"
        assert results[0]["device_id"] == "dev_001"

    def test_ping_outside_radius_not_matched(self):
        # Place ping ~10 km away — outside 1 km catchment
        ping = _make_ping(40.85, -74.05)
        results = spatial_join_catchments([ping], [STORE_NYC], radius_km=1.0)
        assert len(results) == 0

    def test_ping_matched_to_nearest_store(self):
        # One ping near NYC only
        ping = _make_ping(40.7582, -73.9858)
        results = spatial_join_catchments([ping], [STORE_NYC, STORE_BROOKLYN], radius_km=1.0)
        store_ids = {r["store_id"] for r in results}
        assert "S001" in store_ids
        assert "S002" not in store_ids

    def test_multiple_pings_multiple_stores(self):
        ping_nyc = _make_ping(40.7582, -73.9858, device_id="dev_nyc")
        ping_bk = _make_ping(40.6895, -73.9445, device_id="dev_bk")
        results = spatial_join_catchments(
            [ping_nyc, ping_bk],
            [STORE_NYC, STORE_BROOKLYN],
            radius_km=1.0,
        )
        matched_stores = {r["store_id"] for r in results}
        assert "S001" in matched_stores
        assert "S002" in matched_stores

    def test_returns_h3_index_when_present(self):
        ping = {**_make_ping(40.7582, -73.9858), "h3_index": "89283082837ffff"}
        results = spatial_join_catchments([ping], [STORE_NYC], radius_km=1.0)
        assert results[0]["h3_index"] == "89283082837ffff"

    def test_empty_pings_returns_empty(self):
        assert spatial_join_catchments([], [STORE_NYC]) == []

    def test_empty_stores_returns_empty(self):
        ping = _make_ping(40.7582, -73.9858)
        assert spatial_join_catchments([ping], []) == []


# ---------------------------------------------------------------------------
# sedona_spatial_join_catchments — availability guard tests
# ---------------------------------------------------------------------------

class TestSedonaSpatialJoinGuard:
    """
    These tests exercise the Sedona availability guard without requiring
    PySpark / Sedona to actually be installed in the test environment.
    """

    def test_raises_runtime_error_when_sedona_unavailable(self, monkeypatch):
        """
        Simulate a missing Sedona installation by forcing SEDONA_AVAILABLE=False
        in the module under test, then confirm the public function raises
        RuntimeError with a helpful install message.
        """
        import src.spatial.spatial_transform as st_module

        monkeypatch.setattr(st_module, "SEDONA_AVAILABLE", False)

        ping = _make_ping(40.7582, -73.9858)
        with pytest.raises(RuntimeError, match="PySpark and Apache Sedona are required"):
            st_module.sedona_spatial_join_catchments([ping], [STORE_NYC])

    def test_error_message_contains_install_hint(self, monkeypatch):
        import src.spatial.spatial_transform as st_module
        monkeypatch.setattr(st_module, "SEDONA_AVAILABLE", False)

        ping = _make_ping(40.7582, -73.9858)
        with pytest.raises(RuntimeError) as exc_info:
            st_module.sedona_spatial_join_catchments([ping], [STORE_NYC])
        assert "pip install" in str(exc_info.value)

    @pytest.mark.skipif(SEDONA_AVAILABLE, reason="Only runs when Sedona is NOT installed")
    def test_sedona_unavailable_in_this_env(self):
        """
        Confirms that SEDONA_AVAILABLE is correctly False in environments
        (e.g. CI) that do not have PySpark/Sedona installed.
        """
        ping = _make_ping(40.7582, -73.9858)
        with pytest.raises(RuntimeError):
            sedona_spatial_join_catchments([ping], [STORE_NYC])


# ---------------------------------------------------------------------------
# write_joins_to_snowflake — null-guard test (no Snowflake connection needed)
# ---------------------------------------------------------------------------

class TestWriteJoinsToSnowflakeGuard:
    def test_raises_runtime_error_on_none_df(self):
        """write_joins_to_snowflake must raise RuntimeError if spark_df is None."""
        with pytest.raises(RuntimeError, match="spark_df must not be None"):
            write_joins_to_snowflake(None, sf_conn_params={})
