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


# ---------------------------------------------------------------------------
# Catchment Spatial Join — PySpark + Apache Sedona (distributed)
# ---------------------------------------------------------------------------

# Sedona availability guard — resolved once at import time so callers can
# branch on SEDONA_AVAILABLE without catching ImportError themselves.
try:
    from pyspark.sql import SparkSession, DataFrame as SparkDataFrame
    from pyspark.sql import functions as F
    from sedona.spark import SedonaContext  # Sedona 1.4+ unified entry-point
    from sedona.register import SedonaRegistrar  # fallback for older builds
    SEDONA_AVAILABLE = True
except ImportError:  # pragma: no cover
    SEDONA_AVAILABLE = False


def _require_sedona() -> None:
    """Raise a clear RuntimeError when PySpark / Sedona are not installed."""
    if not SEDONA_AVAILABLE:
        raise RuntimeError(
            "PySpark and Apache Sedona are required for sedona_spatial_join_catchments(). "
            "Install them with: pip install pyspark apache-sedona"
        )


def sedona_spatial_join_catchments(
    pings: list[dict],
    stores: list[dict],
    radius_km: float = 1.0,
    spark: "SparkSession | None" = None,
) -> "SparkDataFrame":
    """
    Join GPS pings to store catchment areas using a real PySpark + Apache Sedona
    distributed spatial range join.

    This replaces the Python nested-loop bounding-box approximation with a proper
    Sedona spatial predicate executed across the Spark cluster. Under the hood Sedona
    builds an R-tree / quadtree index on the store geometries and evaluates
    ``ST_Distance(ping_geom, store_geom) <= radius_deg`` as a vectorised spatial
    join — no Python-level row iteration occurs.

    Catchment geometry:
        Catchments are defined as circular areas of ``radius_km`` around each store
        centroid. Because the dataset spans mid-latitudes we convert the kilometre
        radius to a degree threshold using the equatorial approximation
        (1° ≈ 111 km).  Callers working with real polygon WKTs can swap the
        ``ST_Distance`` predicate for ``ST_Contains(catchment_poly, ping_geom)``
        without any other code changes.

    Args:
        pings:      Enriched GPS ping records. Each dict must contain:
                    ``device_id``, ``latitude``, ``longitude``, ``timestamp``.
                    May optionally contain ``h3_index`` (added by bin_pings_to_h3).
        stores:     Store location records. Each dict must contain:
                    ``store_id``, ``latitude``, ``longitude``.
                    May optionally contain ``store_name``.
        radius_km:  Catchment radius in kilometres (default 1.0 km).
        spark:      An existing SparkSession.  If None a new SedonaContext session
                    is created automatically (suitable for local / test runs).

    Returns:
        A Spark DataFrame with the following columns:

        +--------------+------------------+----------------------------------------------+
        | Column       | Type             | Description                                  |
        +==============+==================+==============================================+
        | ping_id      | LongType         | Synthetic monotonic ping identifier           |
        | device_id    | StringType       | Anonymised device identifier                 |
        | store_id     | StringType       | Matched store identifier                     |
        | store_name   | StringType       | Human-readable store name                   |
        | timestamp    | StringType       | ISO-8601 GPS ping timestamp                  |
        | h3_index     | StringType       | H3 cell ID at resolution 9 (if available)   |
        | distance_km  | DoubleType       | Great-circle distance ping → store centroid  |
        +--------------+------------------+----------------------------------------------+

    Raises:
        RuntimeError: If PySpark or Apache Sedona are not installed.
    """
    _require_sedona()

    import math
    from pyspark.sql.types import (
        StructType, StructField,
        StringType, DoubleType, LongType,
    )

    # ------------------------------------------------------------------
    # 1. Resolve / create SparkSession with Sedona registered
    # ------------------------------------------------------------------
    if spark is None:
        spark = (
            SedonaContext.builder()
            .appName("geopulse-sedona-spatial-join")
            .master("local[*]")
            .getOrCreate()
        )
        spark = SedonaContext.create(spark)
    else:
        # Register Sedona UDFs on the caller-supplied session
        try:
            spark = SedonaContext.create(spark)
        except Exception:
            # Already registered (SedonaContext.create raises if called twice)
            pass

    # ------------------------------------------------------------------
    # 2. Build the pings DataFrame with a Sedona ST_Point geometry column
    #    ping_id is synthesised via monotonically_increasing_id() — a
    #    standard Spark pattern for surrogate keys on DataFrames without
    #    a natural primary key.
    # ------------------------------------------------------------------
    ping_schema = StructType([
        StructField("device_id", StringType(), False),
        StructField("latitude",  DoubleType(),  False),
        StructField("longitude", DoubleType(),  False),
        StructField("timestamp", StringType(),  False),
        StructField("h3_index",  StringType(),  True),
    ])

    ping_rows = [
        (
            str(p["device_id"]),
            float(p["latitude"]),
            float(p["longitude"]),
            str(p["timestamp"]),
            str(p.get("h3_index", "") or ""),
        )
        for p in pings
    ]

    df_pings = (
        spark.createDataFrame(ping_rows, schema=ping_schema)
        .withColumn("ping_id", F.monotonically_increasing_id())
        # ST_Point(lon, lat) — Sedona follows GeoJSON (x=lon, y=lat) convention
        .withColumn("ping_geom", F.expr("ST_Point(longitude, latitude)"))
    )

    # ------------------------------------------------------------------
    # 3. Build the stores DataFrame with a Sedona ST_Point geometry column
    # ------------------------------------------------------------------
    store_schema = StructType([
        StructField("store_id",   StringType(), False),
        StructField("store_name", StringType(), True),
        StructField("store_lat",  DoubleType(),  False),
        StructField("store_lon",  DoubleType(),  False),
    ])

    store_rows = [
        (
            str(s["store_id"]),
            str(s.get("store_name", "") or ""),
            float(s["latitude"]),
            float(s["longitude"]),
        )
        for s in stores
    ]

    df_stores = (
        spark.createDataFrame(store_rows, schema=store_schema)
        .withColumn("store_geom", F.expr("ST_Point(store_lon, store_lat)"))
    )

    # ------------------------------------------------------------------
    # 4. Sedona distributed spatial range join
    #
    #    ST_Distance returns degrees (WGS-84 planar approx).  We convert
    #    the kilometre radius to degrees using 1° ≈ 111 km.
    #    Sedona automatically applies a spatial index (R-tree) on the
    #    broadcast/build side when one DataFrame is sufficiently smaller,
    #    making this a true distributed spatial join — not row-by-row.
    # ------------------------------------------------------------------
    radius_deg = radius_km / 111.0

    df_joined = (
        df_pings.alias("p")
        .join(
            df_stores.alias("s"),
            F.expr(f"ST_Distance(p.ping_geom, s.store_geom) <= {radius_deg}"),
            how="inner",
        )
    )

    # ------------------------------------------------------------------
    # 5. Compute great-circle distance in km using Sedona ST_DistanceSphere
    #    (returns metres) and project the required output columns.
    # ------------------------------------------------------------------
    df_result = df_joined.select(
        F.col("p.ping_id").alias("ping_id"),
        F.col("p.device_id").alias("device_id"),
        F.col("s.store_id").alias("store_id"),
        F.col("s.store_name").alias("store_name"),
        F.col("p.timestamp").alias("timestamp"),
        F.col("p.h3_index").alias("h3_index"),
        # ST_DistanceSphere returns metres → divide by 1000 for km
        F.round(
            F.expr("ST_DistanceSphere(p.ping_geom, s.store_geom)") / 1000.0,
            4,
        ).alias("distance_km"),
    )

    row_count = df_result.count()
    logger.info(
        f"[Sedona] Spatial join produced {row_count} ping-store matches "
        f"({len(pings)} pings x {len(stores)} stores, radius={radius_km} km)"
    )
    return df_result


# ---------------------------------------------------------------------------
# Snowflake writer — persists Sedona join output to RAW.GPS_PING_STORE_JOINS
# ---------------------------------------------------------------------------

def write_joins_to_snowflake(
    spark_df: "SparkDataFrame",
    sf_conn_params: dict,
    table: str = "GPS_PING_STORE_JOINS",
) -> int:
    """
    Write the Sedona spatial join output DataFrame to a Snowflake table,
    creating the upstream source consumed by ``stg_gps_ping_store_joins``.

    The written table (``GEOPULSE_DB.RAW.GPS_PING_STORE_JOINS``) is the
    canonical upstream source for the dbt staging model.  It is populated
    exclusively by this function — never hand-loaded or seeded.

    Schema written to Snowflake
    ---------------------------
    +--------------+-------------------+----------------------------------------------+
    | Column       | Snowflake type    | Description                                  |
    +==============+===================+==============================================+
    | ping_id      | NUMBER            | Synthetic monotonic ping identifier          |
    | device_id    | VARCHAR(64)       | Anonymised device identifier                 |
    | store_id     | VARCHAR(32)       | Matched store identifier                     |
    | store_name   | VARCHAR(128)      | Human-readable store name                   |
    | timestamp_raw| VARCHAR           | ISO-8601 GPS ping timestamp string           |
    | h3_index     | VARCHAR(20)       | H3 cell ID at resolution 9                  |
    | distance_km  | FLOAT             | Haversine distance ping → store centroid (km)|
    | ingested_at  | TIMESTAMP_NTZ     | Pipeline write timestamp (UTC)               |
    +--------------+-------------------+----------------------------------------------+

    Args:
        spark_df:       Output of ``sedona_spatial_join_catchments()``.
        sf_conn_params: Snowflake connection kwargs accepted by
                        ``snowflake.connector.connect()``.  Expected keys:
                        ``account``, ``user``, ``password``, ``database``,
                        ``schema``, ``warehouse`` (optional), ``role`` (optional).
        table:          Destination table name (default ``GPS_PING_STORE_JOINS``).

    Returns:
        Number of rows written.

    Raises:
        ImportError: If ``snowflake-connector-python`` is not installed.
        RuntimeError: If ``spark_df`` is None or the write fails.
    """
    if spark_df is None:
        raise RuntimeError("spark_df must not be None.")

    try:
        import snowflake.connector
        from snowflake.connector.pandas_tools import write_pandas
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            "snowflake-connector-python is required for write_joins_to_snowflake(). "
            "Install with: pip install snowflake-connector-python[pandas]"
        ) from exc

    from datetime import datetime, timezone

    # Collect to pandas — acceptable given that join output is already filtered
    # to store-vicinity pings; volume is far smaller than raw input.
    pdf = spark_df.toPandas()
    pdf = pdf.rename(columns={"timestamp": "timestamp_raw"})
    pdf["ingested_at"] = datetime.now(timezone.utc).replace(tzinfo=None)

    # Normalise column names to uppercase for Snowflake case-insensitive matching
    pdf.columns = [c.upper() for c in pdf.columns]

    conn = snowflake.connector.connect(**sf_conn_params)
    try:
        success, nchunks, nrows, _ = write_pandas(
            conn,
            pdf,
            table_name=table.upper(),
            auto_create_table=True,
            overwrite=False,  # append; Airflow handles idempotency via unique_key
        )
        if not success:
            raise RuntimeError(
                f"write_pandas reported failure after {nchunks} chunks / {nrows} rows."
            )
        logger.info(
            f"[Snowflake] Wrote {nrows} rows to {sf_conn_params.get('database', 'GEOPULSE_DB')}"
            f".{sf_conn_params.get('schema', 'RAW')}.{table.upper()}"
        )
        return nrows
    finally:
        conn.close()
