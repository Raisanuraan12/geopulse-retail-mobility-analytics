"""
Unit tests for src/analytics/footfall_metrics.py

Covers:
    - aggregate_daily_visitors() now includes visitor_set (ISSUE 3 fix)
    - find_cannibalization_pairs() produces non-zero overlap with real visitor sets
    - find_cannibalization_pairs() returns empty list when stores share no visitors
    - Existing helpers: cannibalization_overlap, visit_frequency_distribution,
      haversine_km

Run with: pytest tests/test_footfall_metrics.py -v
"""

from __future__ import annotations

import sys
import os
import pytest

# Ensure repo root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.analytics.footfall_metrics import (
    aggregate_daily_visitors,
    find_cannibalization_pairs,
    cannibalization_overlap,
    visit_frequency_distribution,
    haversine_km,
    _median,
)


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

def _visit(store_id: str, device_id: str, dwell: int = 10,
           visit_type: str = "short_visit", store_name: str = "") -> dict:
    return {
        "store_id": store_id,
        "store_name": store_name or store_id,
        "visit_date": "2024-06-15",
        "device_id": device_id,
        "dwell_minutes": dwell,
        "visit_type": visit_type,
    }


STORE_LOC_A = {"store_id": "S001", "latitude": 40.7580, "longitude": -73.9855}
STORE_LOC_B = {"store_id": "S002", "latitude": 40.7600, "longitude": -73.9840}  # ~0.25 km away
STORE_LOC_C = {"store_id": "S003", "latitude": 40.9000, "longitude": -74.1000}  # ~16 km away


# ---------------------------------------------------------------------------
# aggregate_daily_visitors — ISSUE 3 fix verification
# ---------------------------------------------------------------------------

class TestAggregateDailyVisitors:
    """
    Verify that aggregate_daily_visitors() includes visitor_set in its output,
    fixing the silent cannibalization-always-0% bug.
    """

    def _make_visits(self):
        return [
            _visit("S001", "dev_001", dwell=15, visit_type="short_visit"),
            _visit("S001", "dev_002", dwell=35, visit_type="long_visit"),
            _visit("S001", "dev_001", dwell=5,  visit_type="short_visit"),  # repeat device
            _visit("S002", "dev_003", dwell=2,  visit_type="pass_by"),
        ]

    def test_visitor_set_present_for_all_stores(self):
        """ISSUE 3: visitor_set must be in the returned metrics dict."""
        metrics = aggregate_daily_visitors(self._make_visits())
        for store_id, data in metrics.items():
            assert "visitor_set" in data, (
                f"visitor_set missing from store {store_id} — cannibalization will be wrong"
            )

    def test_visitor_set_is_a_set(self):
        metrics = aggregate_daily_visitors(self._make_visits())
        assert isinstance(metrics["S001"]["visitor_set"], set)
        assert isinstance(metrics["S002"]["visitor_set"], set)

    def test_visitor_set_contains_correct_devices(self):
        metrics = aggregate_daily_visitors(self._make_visits())
        # dev_001 visited twice but should appear only once in the set
        assert metrics["S001"]["visitor_set"] == {"dev_001", "dev_002"}
        assert metrics["S002"]["visitor_set"] == {"dev_003"}

    def test_unique_visitors_matches_visitor_set_length(self):
        metrics = aggregate_daily_visitors(self._make_visits())
        for store_id, data in metrics.items():
            assert data["unique_visitors"] == len(data["visitor_set"]), (
                "unique_visitors count must match len(visitor_set)"
            )

    def test_existing_metrics_still_correct(self):
        """Confirm the fix did not break any pre-existing metric values."""
        metrics = aggregate_daily_visitors(self._make_visits())
        s1 = metrics["S001"]
        assert s1["total_visits"] == 3
        assert s1["unique_visitors"] == 2
        assert s1["long_visit_count"] == 1
        assert s1["short_visit_count"] == 2
        assert s1["pass_by_count"] == 0

    def test_empty_visits_returns_empty_dict(self):
        assert aggregate_daily_visitors([]) == {}


# ---------------------------------------------------------------------------
# find_cannibalization_pairs — ISSUE 3 end-to-end verification
# ---------------------------------------------------------------------------

class TestFindCannibalizationPairs:
    """
    With visitor_set now populated, confirm overlap percentages are correct
    for stores with known shared and non-shared visitors.
    """

    def _build_metrics(self, visits):
        return aggregate_daily_visitors(visits)

    def test_cannibalization_non_zero_with_overlapping_visitors(self):
        """
        S001 and S002 are ~0.25 km apart (within 2 km threshold).
        dev_001 and dev_002 visit BOTH stores → overlap must be non-zero.
        """
        visits = [
            # S001 — 4 unique devices
            _visit("S001", "dev_001"),
            _visit("S001", "dev_002"),
            _visit("S001", "dev_003"),
            _visit("S001", "dev_004"),
            # S002 — dev_001 and dev_002 also visited here
            _visit("S002", "dev_001"),
            _visit("S002", "dev_002"),
            _visit("S002", "dev_005"),
        ]
        metrics = self._build_metrics(visits)
        pairs = find_cannibalization_pairs(
            metrics,
            [STORE_LOC_A, STORE_LOC_B],
            radius_km=2.0,
            min_overlap_pct=1.0,
        )
        assert len(pairs) == 1, "Expected exactly one cannibalization pair"
        pair = pairs[0]
        assert pair["shared_visitors"] == 2
        assert pair["jaccard_index"] > 0.0
        # Overlap for S001: 2/4 = 50%; for S002: 2/3 ≈ 66.7%
        assert pair["overlap_pct_store_a"] > 0.0 or pair["overlap_pct_store_b"] > 0.0
        assert pair["overlap_pct_store_a"] == pytest.approx(50.0, abs=0.01) or \
               pair["overlap_pct_store_b"] == pytest.approx(50.0, abs=0.01)

    def test_cannibalization_empty_when_no_shared_visitors(self):
        """
        S001 and S002 are nearby but share no devices → no flagged pairs.
        """
        visits = [
            _visit("S001", "dev_001"),
            _visit("S001", "dev_002"),
            _visit("S002", "dev_003"),
            _visit("S002", "dev_004"),
        ]
        metrics = self._build_metrics(visits)
        pairs = find_cannibalization_pairs(
            metrics,
            [STORE_LOC_A, STORE_LOC_B],
            radius_km=2.0,
            min_overlap_pct=5.0,
        )
        assert len(pairs) == 0, (
            "Stores with no shared visitors must not appear as cannibalization pairs"
        )

    def test_cannibalization_empty_when_stores_too_far_apart(self):
        """
        S001 and S003 are ~16 km apart (above 2 km threshold) — even with
        overlapping visitors, they must not be flagged.
        """
        visits = [
            _visit("S001", "dev_001"),
            _visit("S001", "dev_002"),
            _visit("S003", "dev_001"),  # same device, but stores are far apart
            _visit("S003", "dev_002"),
        ]
        metrics = self._build_metrics(visits)
        pairs = find_cannibalization_pairs(
            metrics,
            [STORE_LOC_A, STORE_LOC_C],
            radius_km=2.0,
            min_overlap_pct=5.0,
        )
        assert len(pairs) == 0

    def test_results_sorted_by_jaccard_descending(self):
        """
        find_cannibalization_pairs sorts by jaccard_index descending.
        Add a third store pair to verify ordering.
        """
        store_loc_d = {"store_id": "S004", "latitude": 40.7590, "longitude": -73.9850}
        visits = [
            # S001 & S002: 2 of 4 shared → Jaccard = 2/5 = 0.4
            _visit("S001", "dev_001"), _visit("S001", "dev_002"),
            _visit("S001", "dev_003"), _visit("S001", "dev_004"),
            _visit("S002", "dev_001"), _visit("S002", "dev_002"),
            _visit("S002", "dev_006"), _visit("S002", "dev_007"), _visit("S002", "dev_008"),
            # S001 & S004: 3 of 4 shared → Jaccard = 3/4 = 0.75 (higher)
            _visit("S004", "dev_001"), _visit("S004", "dev_002"), _visit("S004", "dev_003"),
        ]
        metrics = self._build_metrics(visits)
        pairs = find_cannibalization_pairs(
            metrics,
            [STORE_LOC_A, STORE_LOC_B, store_loc_d],
            radius_km=2.0,
            min_overlap_pct=1.0,
        )
        # Highest Jaccard pair should come first
        if len(pairs) >= 2:
            assert pairs[0]["jaccard_index"] >= pairs[1]["jaccard_index"]


# ---------------------------------------------------------------------------
# cannibalization_overlap — unit tests (existing function, unchanged)
# ---------------------------------------------------------------------------

class TestCannibalizationOverlap:
    def test_full_overlap(self):
        s = {"A", "B", "C"}
        result = cannibalization_overlap(s, s)
        assert result["jaccard_index"] == 1.0
        assert result["overlap_pct_store_a"] == 100.0
        assert result["shared_visitors"] == 3

    def test_no_overlap(self):
        result = cannibalization_overlap({"A", "B"}, {"C", "D"})
        assert result["shared_visitors"] == 0
        assert result["jaccard_index"] == 0.0
        assert result["overlap_pct_store_a"] == 0.0
        assert result["overlap_pct_store_b"] == 0.0

    def test_partial_overlap(self):
        result = cannibalization_overlap({"A", "B", "C"}, {"B", "C", "D"})
        assert result["shared_visitors"] == 2
        # Jaccard = 2/4 = 0.5
        assert result["jaccard_index"] == pytest.approx(0.5, abs=0.001)

    def test_empty_sets(self):
        result = cannibalization_overlap(set(), set())
        assert result["jaccard_index"] == 0.0
        assert result["shared_visitors"] == 0


# ---------------------------------------------------------------------------
# haversine_km — unit test (existing function, unchanged)
# ---------------------------------------------------------------------------

class TestHaversineKm:
    def test_same_point_is_zero(self):
        assert haversine_km(40.0, -74.0, 40.0, -74.0) == pytest.approx(0.0, abs=1e-6)

    def test_known_distance(self):
        # NYC Times Square to Empire State Building ~1.6 km
        dist = haversine_km(40.7580, -73.9855, 40.7484, -73.9967)
        assert 1.0 < dist < 2.5

    def test_symmetry(self):
        d1 = haversine_km(40.0, -74.0, 41.0, -73.0)
        d2 = haversine_km(41.0, -73.0, 40.0, -74.0)
        assert d1 == pytest.approx(d2, rel=1e-6)


# ---------------------------------------------------------------------------
# visit_frequency_distribution — unit test (existing function, unchanged)
# ---------------------------------------------------------------------------

class TestVisitFrequencyDistribution:
    def test_single_visit_devices(self):
        visits = [
            _visit("S001", "dev_001"),
            _visit("S001", "dev_002"),
        ]
        dist = visit_frequency_distribution(visits, "S001")
        assert dist == {1: 2}

    def test_repeat_visitor(self):
        visits = [
            _visit("S001", "dev_001"),
            _visit("S001", "dev_001"),
            _visit("S001", "dev_001"),
        ]
        dist = visit_frequency_distribution(visits, "S001")
        assert dist == {3: 1}

    def test_six_plus_bucket(self):
        visits = [_visit("S001", "dev_001")] * 7
        dist = visit_frequency_distribution(visits, "S001")
        assert 6 in dist  # 7 → capped at bucket 6

    def test_filters_to_store(self):
        visits = [
            _visit("S001", "dev_001"),
            _visit("S002", "dev_002"),
        ]
        dist = visit_frequency_distribution(visits, "S001")
        assert dist == {1: 1}
