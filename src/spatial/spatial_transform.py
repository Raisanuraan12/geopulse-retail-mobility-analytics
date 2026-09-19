"""
Spatial Transformation Module
Performs H3 hex-binning and spatial joins between GPS pings
and store catchment polygons using Apache Sedona / H3.
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

try:
    import h3
    H3_AVAILABLE = True
except ImportError:  # pragma: no cover
    H3_AVAILABLE = False
    logger.warning("h3-py not installed; H3 functions will be unavailable.")


# ---------------------------------------------------------------------------
# H3 Hex-binning
# ---------------------------------------------------------------------------

DEFAULT_RESOLUTION = 9  # ~174 m edge length – good for retail catchment


def lat_lon_to_h3(lat: float, lon: float, resolution: int = DEFAULT_RESOLUTION) -> str:
    """Convert a lat/lon coordinate to its H3 cell ID string."""
    if not H3_AVAILABLE:
        raise RuntimeError("h3 package is required for spatial binning.")
    return h3.geo_to_h3(lat, lon, resolution)


def bin_pings_to_h3(pings: list[dict], resolution: int = DEFAULT_RESOLUTION) -> list[dict]:
    """
    Annotate each GPS ping with its H3 cell ID.

    Args:
        pings: List of validated GPS ping dicts (must contain 'latitude', 'longitude').
        resolution: H3 resolution level (0-15).

    Returns:
        Pings enriched with 'h3_index' key.
    """
    enriched = []
    for ping in pings:
        try:
            h3_idx = lat_lon_to_h3(ping["latitude"], ping["longitude"], resolution)
            enriched.append({**ping, "h3_index": h3_idx})
        except Exception as exc:
            logger.debug(f"Skipping ping {ping.get('device_id')} due to H3 error: {exc}")
    logger.info(f"H3-binned {len(enriched)}/{len(pings)} pings at resolution {resolution}")
    return enriched


# ---------------------------------------------------------------------------
# Catchment Spatial Join (bounding-box approximation)
# ---------------------------------------------------------------------------

def point_in_bbox(lat: float, lon: float, bbox: dict) -> bool:
    """
    Quick bounding-box containment check.

    Args:
        lat: Latitude of the point.
        lon: Longitude of the point.
        bbox: Dict with keys min_lat, max_lat, min_lon, max_lon.

    Returns:
        True if the point is inside the bounding box.
    """
    return (
        bbox["min_lat"] <= lat <= bbox["max_lat"]
        and bbox["min_lon"] <= lon <= bbox["max_lon"]
    )


def spatial_join_catchments(
    pings: list[dict],
    stores: list[dict],
    radius_km: float = 1.0,
) -> list[dict]:
    """
    Join GPS pings to store catchment areas using a bounding-box approximation.

    Each store dict must contain:
        store_id, store_name, latitude, longitude

    Args:
        pings: Enriched GPS ping records.
        stores: Store location records.
        radius_km: Catchment radius in kilometres.

    Returns:
        List of join results with device, timestamp, and matched store info.
    """
    import math

    # 1 degree latitude ≈ 111 km
    lat_delta = radius_km / 111.0
    results = []

    for store in stores:
        slat, slon = store["latitude"], store["longitude"]
        # longitude delta depends on latitude
        lon_delta = radius_km / (111.0 * math.cos(math.radians(slat)))

        bbox = {
            "min_lat": slat - lat_delta,
            "max_lat": slat + lat_delta,
            "min_lon": slon - lon_delta,
            "max_lon": slon + lon_delta,
        }

        for ping in pings:
            if point_in_bbox(ping["latitude"], ping["longitude"], bbox):
                results.append(
                    {
                        "device_id": ping["device_id"],
                        "timestamp": ping["timestamp"],
                        "store_id": store["store_id"],
                        "store_name": store.get("store_name", ""),
                        "h3_index": ping.get("h3_index", ""),
                    }
                )

    logger.info(
        f"Spatial join produced {len(results)} ping-store matches "
        f"({len(pings)} pings x {len(stores)} stores, radius={radius_km} km)"
    )
    return results
