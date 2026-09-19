"""
GPS Data Ingestion Module
Handles loading and validating raw GPS ping data from CSV sources
into the GeoPulse pipeline.
"""

import csv
import json
import logging
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


REQUIRED_COLUMNS = {"device_id", "latitude", "longitude", "timestamp", "accuracy_meters"}

LAT_RANGE = (-90.0, 90.0)
LON_RANGE = (-180.0, 180.0)
MAX_ACCURACY_METERS = 100  # discard low-accuracy pings


def validate_row(row: dict) -> bool:
    """Return True if a GPS row passes quality checks."""
    try:
        lat = float(row["latitude"])
        lon = float(row["longitude"])
        acc = float(row["accuracy_meters"])
        # parse timestamp to ensure it's valid
        datetime.fromisoformat(row["timestamp"])
    except (ValueError, KeyError):
        return False

    if not (LAT_RANGE[0] <= lat <= LAT_RANGE[1]):
        return False
    if not (LON_RANGE[0] <= lon <= LON_RANGE[1]):
        return False
    if acc > MAX_ACCURACY_METERS:
        return False
    return True


def load_gps_csv(filepath: str) -> list[dict]:
    """
    Load GPS pings from a CSV file.

    Args:
        filepath: Path to the CSV file.

    Returns:
        List of validated GPS ping dictionaries.
    """
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"GPS data file not found: {filepath}")

    records = []
    skipped = 0

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        missing = REQUIRED_COLUMNS - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"CSV missing required columns: {missing}")

        for row in reader:
            if validate_row(row):
                records.append(
                    {
                        "device_id": row["device_id"],
                        "latitude": float(row["latitude"]),
                        "longitude": float(row["longitude"]),
                        "timestamp": row["timestamp"],
                        "accuracy_meters": float(row["accuracy_meters"]),
                    }
                )
            else:
                skipped += 1

    logger.info(f"Loaded {len(records)} valid pings, skipped {skipped} invalid rows from {filepath}")
    return records


def save_as_json(records: list[dict], output_path: str) -> None:
    """Persist validated records as JSON for downstream processing."""
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
    logger.info(f"Saved {len(records)} records to {output_path}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python gps_ingestion.py <path_to_csv>")
        sys.exit(1)

    data = load_gps_csv(sys.argv[1])
    out = sys.argv[2] if len(sys.argv) > 2 else "gps_pings_validated.json"
    save_as_json(data, out)
