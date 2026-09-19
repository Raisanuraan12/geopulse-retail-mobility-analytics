"""
Footfall Metrics Analytics
Computes key retail mobility KPIs from daily visit records:
  - Unique visitors per store
  - Average dwell time
  - Visit frequency distribution
  - Cannibalization overlap between nearby stores
"""

from __future__ import annotations

import math
from collections import defaultdict
from typing import Optional


# ---------------------------------------------------------------------------
# Visitor aggregation
# ---------------------------------------------------------------------------


def aggregate_daily_visitors(visits: list[dict]) -> dict[str, dict]:
    """
    Aggregate daily footfall metrics per store.

    Args:
        visits: Records from fct_footfall_daily. Each dict must have:
                store_id, store_name, visit_date, device_id, dwell_minutes, visit_type.

    Returns:
        Dict keyed by store_id with aggregated metrics. Each value contains:
            - store_id, store_name
            - total_visits, unique_visitors
            - avg_dwell_minutes, median_dwell_minutes
            - pass_by_count, short_visit_count, long_visit_count
            - visitor_set (set[str]): full set of unique device_ids for this store.
              Used by find_cannibalization_pairs() to compute visitor overlap.
    """
    store_metrics: dict[str, dict] = {}

    # Group by store
    grouped: dict[str, list[dict]] = defaultdict(list)
    for visit in visits:
        grouped[visit["store_id"]].append(visit)

    for store_id, store_visits in grouped.items():
        unique_devices = {v["device_id"] for v in store_visits}
        dwell_values = [v["dwell_minutes"] for v in store_visits if v["dwell_minutes"] > 0]

        visit_type_counts: dict[str, int] = defaultdict(int)
        for v in store_visits:
            visit_type_counts[v["visit_type"]] += 1

        store_metrics[store_id] = {
            "store_id": store_id,
            "store_name": store_visits[0].get("store_name", ""),
            "total_visits": len(store_visits),
            "unique_visitors": len(unique_devices),
            "avg_dwell_minutes": round(sum(dwell_values) / len(dwell_values), 2) if dwell_values else 0.0,
            "median_dwell_minutes": _median(dwell_values),
            "pass_by_count": visit_type_counts.get("pass_by", 0),
            "short_visit_count": visit_type_counts.get("short_visit", 0),
            "long_visit_count": visit_type_counts.get("long_visit", 0),
            # visitor_set is required by find_cannibalization_pairs() to compute
            # shared-visitor overlap between nearby stores.  Previously missing,
            # causing cannibalization overlap to always silently return 0%.
            "visitor_set": unique_devices,
        }

    return store_metrics



def _median(values: list[float]) -> float:
    """Calculate the median of a list of floats."""
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    mid = n // 2
    return sorted_vals[mid] if n % 2 else (sorted_vals[mid - 1] + sorted_vals[mid]) / 2.0


# ---------------------------------------------------------------------------
# Visit frequency distribution
# ---------------------------------------------------------------------------


def visit_frequency_distribution(visits: list[dict], store_id: str) -> dict[int, int]:
    """
    Compute how many visitors made 1, 2, 3+ visits to a store in the period.

    Args:
        visits: All visit records for any date range.
        store_id: Filter to this store.

    Returns:
        Dict mapping visit_count -> number_of_devices.
    """
    device_counts: dict[str, int] = defaultdict(int)
    for v in visits:
        if v["store_id"] == store_id:
            device_counts[v["device_id"]] += 1

    freq_dist: dict[int, int] = defaultdict(int)
    for count in device_counts.values():
        bucket = count if count <= 5 else 6  # 6 = "6+" bucket
        freq_dist[bucket] += 1

    return dict(sorted(freq_dist.items()))


# ---------------------------------------------------------------------------
# Retail cannibalization overlap
# ---------------------------------------------------------------------------


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in km between two coordinates."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def cannibalization_overlap(
    store_a_visitors: set[str],
    store_b_visitors: set[str],
) -> dict[str, float]:
    """
    Measure shared visitor overlap between two stores.

    Returns:
        Dict with shared_count, jaccard_index, overlap_pct_a, overlap_pct_b.
    """
    shared = store_a_visitors & store_b_visitors
    union = store_a_visitors | store_b_visitors

    return {
        "shared_visitors": len(shared),
        "jaccard_index": round(len(shared) / len(union), 4) if union else 0.0,
        "overlap_pct_store_a": round(len(shared) / len(store_a_visitors) * 100, 2) if store_a_visitors else 0.0,
        "overlap_pct_store_b": round(len(shared) / len(store_b_visitors) * 100, 2) if store_b_visitors else 0.0,
    }


def find_cannibalization_pairs(
    store_metrics: dict[str, dict],
    store_locations: list[dict],
    radius_km: float = 2.0,
    min_overlap_pct: float = 5.0,
) -> list[dict]:
    """
    Identify pairs of nearby stores with significant visitor overlap.

    Args:
        store_metrics: Output of aggregate_daily_visitors with visitor sets.
        store_locations: List of dicts with store_id, latitude, longitude.
        radius_km: Distance threshold to consider stores as nearby.
        min_overlap_pct: Minimum overlap percentage to flag as cannibalization.

    Returns:
        List of cannibalization pair records.
    """
    loc_map = {s["store_id"]: s for s in store_locations}
    store_ids = list(store_metrics.keys())
    results = []

    for i in range(len(store_ids)):
        for j in range(i + 1, len(store_ids)):
            sid_a, sid_b = store_ids[i], store_ids[j]
            if sid_a not in loc_map or sid_b not in loc_map:
                continue

            dist = haversine_km(
                loc_map[sid_a]["latitude"], loc_map[sid_a]["longitude"],
                loc_map[sid_b]["latitude"], loc_map[sid_b]["longitude"],
            )
            if dist > radius_km:
                continue

            visitors_a = store_metrics[sid_a].get("visitor_set", set())
            visitors_b = store_metrics[sid_b].get("visitor_set", set())
            overlap = cannibalization_overlap(visitors_a, visitors_b)

            if max(overlap["overlap_pct_store_a"], overlap["overlap_pct_store_b"]) >= min_overlap_pct:
                results.append(
                    {
                        "store_a": sid_a,
                        "store_b": sid_b,
                        "distance_km": round(dist, 3),
                        **overlap,
                    }
                )

    return sorted(results, key=lambda x: x["jaccard_index"], reverse=True)
