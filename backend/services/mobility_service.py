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


def get_hourly_footfall():
    hourly_data = {}

    with open(DATASET_PATH, mode="r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            timestamp = row["timestamp"]
            hour = timestamp[11:13]

            if hour not in hourly_data:
                hourly_data[hour] = {
                    "total_pings": 0,
                    "devices": set()
                }

            hourly_data[hour]["total_pings"] += 1
            hourly_data[hour]["devices"].add(row["device_id"])

    footfall = []

    for hour in sorted(hourly_data.keys()):
        footfall.append({
            "hour": f"{hour}:00",
            "total_pings": hourly_data[hour]["total_pings"],
            "unique_devices": len(hourly_data[hour]["devices"])
        })

    return footfall


def get_peak_traffic():
    footfall = get_hourly_footfall()

    if not footfall:
        return None

    peak_hour = max(
        footfall,
        key=lambda item: item["total_pings"]
    )

    return peak_hour


def get_traffic_periods():
    footfall = get_hourly_footfall()

    periods = {
        "morning": {"total_pings": 0, "devices": set()},
        "afternoon": {"total_pings": 0, "devices": set()},
        "evening": {"total_pings": 0, "devices": set()},
        "night": {"total_pings": 0, "devices": set()}
    }

    # Read the original dataset so unique devices are not double-counted
    # within each time period.
    with open(DATASET_PATH, mode="r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            hour = int(row["timestamp"][11:13])

            if 6 <= hour < 12:
                period = "morning"
            elif 12 <= hour < 17:
                period = "afternoon"
            elif 17 <= hour < 21:
                period = "evening"
            else:
                period = "night"

            periods[period]["total_pings"] += 1
            periods[period]["devices"].add(row["device_id"])

    result = []

    for period, values in periods.items():
        result.append({
            "period": period,
            "total_pings": values["total_pings"],
            "unique_devices": len(values["devices"])
        })

    return result