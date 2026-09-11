import csv
from pathlib import Path


DATASET_PATH = Path(__file__).resolve().parents[2] / "geopulse_gps_pings.csv"


def get_mobility_summary():
    total_pings = 0
    unique_devices = set()

    with open(DATASET_PATH, mode="r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            total_pings += 1
            unique_devices.add(row["device_id"])

    return {
        "total_devices": len(unique_devices),
        "total_pings": total_pings,
        "active_stores": 0
    }