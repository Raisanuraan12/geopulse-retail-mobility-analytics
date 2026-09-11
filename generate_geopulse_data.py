"""
GeoPulse Synthetic GPS Ping Data Generator
--------------------------------------------
Generates realistic, anonymized GPS ping data for one urban area, simulating
device movement across morning / afternoon / evening / night so downstream
footfall / catchment-area analysis (Snowflake, PySpark + Sedona, dbt,
Kepler.gl) has meaningful spatio-temporal patterns to work with.

Each simulated device is given a "home" location and a "work" location.
Its pings move between the two depending on time of day:
  - Night (00:00-06:00, 23:00-24:00): clustered near home
  - Morning commute (06:00-10:00): interpolating home -> work
  - Daytime (10:00-17:00): clustered near work
  - Evening commute (17:00-21:00): interpolating work -> home
  - Evening (21:00-23:00): clustered near home

Usage:
  Default (dev-sized dataset, ~100K pings / ~7K devices):
      python generate_geopulse_data.py

  Scaled-up run for the performance/spatial audit (e.g. 1M+ pings):
      python generate_geopulse_data.py --num-pings 1200000 --num-devices 50000 \
          --output geopulse_gps_pings_1M.csv

All other generation logic (city bounds, home/work model, hourly footfall
weighting) stays identical between runs, so results are directly comparable
at different scales.
"""

import argparse
import uuid
from datetime import datetime

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# City bounding box - default is Pune, India (central urban area).
# Swap these four values to target a different city/urban area.
# ---------------------------------------------------------------------------
CITY_NAME = "Pune"
LAT_MIN, LAT_MAX = 18.4500, 18.6200
LON_MIN, LON_MAX = 73.7400, 73.9800

# Hourly footfall weighting: low overnight, sharp morning + evening commute
# peaks, moderate midday/afternoon. Tune freely to change the daily pattern.
HOURLY_WEIGHTS = {
    0: 0.2, 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.2, 5: 0.4,
    6: 1.0, 7: 2.5, 8: 3.0, 9: 2.2, 10: 1.3, 11: 1.2,
    12: 1.5, 13: 1.6, 14: 1.3, 15: 1.2, 16: 1.4,
    17: 2.3, 18: 3.2, 19: 2.8, 20: 1.8, 21: 1.2,
    22: 0.7, 23: 0.3,
}


def build_hour_distribution():
    hours = list(HOURLY_WEIGHTS.keys())
    total = sum(HOURLY_WEIGHTS.values())
    probs = [HOURLY_WEIGHTS[h] / total for h in hours]
    return hours, probs


def generate_device_profiles(num_devices, rng):
    """Anonymized device IDs + a home/work location pair per device."""
    device_ids = [
        f"DEV-{uuid.uuid5(uuid.NAMESPACE_DNS, f'geopulse-device-{i}').hex[:12]}"
        for i in range(num_devices)
    ]
    home_lat = rng.uniform(LAT_MIN, LAT_MAX, num_devices)
    home_lon = rng.uniform(LON_MIN, LON_MAX, num_devices)
    # Work location is a plausible commute distance from home, not a random
    # jump across the whole city.
    work_lat = np.clip(home_lat + rng.normal(0, 0.03, num_devices), LAT_MIN, LAT_MAX)
    work_lon = np.clip(home_lon + rng.normal(0, 0.03, num_devices), LON_MIN, LON_MAX)
    return device_ids, home_lat, home_lon, work_lat, work_lon


def pings_per_device(num_devices, num_pings, rng):
    """Distribute total ping count across devices (roughly even + remainder)."""
    base = num_pings // num_devices
    remainder = num_pings - base * num_devices
    counts = np.full(num_devices, base, dtype=int)
    if remainder > 0:
        bonus_idx = rng.choice(num_devices, remainder, replace=False)
        counts[bonus_idx] += 1
    return counts


def position_for_hour(h, home_lat, home_lon, work_lat, work_lon, rng):
    """Return (lat, lon) for a single device at a given hour of day."""
    if h < 6 or h == 23:
        lat = home_lat + rng.normal(0, 0.002)
        lon = home_lon + rng.normal(0, 0.002)
    elif 6 <= h < 10:
        t = rng.uniform(0, 1)
        lat = home_lat + t * (work_lat - home_lat) + rng.normal(0, 0.003)
        lon = home_lon + t * (work_lon - home_lon) + rng.normal(0, 0.003)
    elif 10 <= h < 17:
        lat = work_lat + rng.normal(0, 0.003)
        lon = work_lon + rng.normal(0, 0.003)
    elif 17 <= h < 21:
        t = rng.uniform(0, 1)
        lat = work_lat + t * (home_lat - work_lat) + rng.normal(0, 0.003)
        lon = work_lon + t * (home_lon - work_lon) + rng.normal(0, 0.003)
    else:  # 21-23
        lat = home_lat + rng.normal(0, 0.003)
        lon = home_lon + rng.normal(0, 0.003)
    return float(np.clip(lat, LAT_MIN, LAT_MAX)), float(np.clip(lon, LON_MIN, LON_MAX))


def generate(num_devices, num_pings, sim_date, seed, output_path):
    rng = np.random.default_rng(seed)
    hours, probs = build_hour_distribution()

    device_ids, home_lat, home_lon, work_lat, work_lon = generate_device_profiles(
        num_devices, rng
    )
    counts = pings_per_device(num_devices, num_pings, rng)

    records = []
    for i in range(num_devices):
        n = counts[i]
        if n == 0:
            continue
        chosen_hours = rng.choice(hours, size=n, p=probs)
        minutes = rng.integers(0, 60, size=n)
        seconds = rng.integers(0, 60, size=n)
        for h, mi, se in zip(chosen_hours, minutes, seconds):
            ts = sim_date.replace(hour=int(h), minute=int(mi), second=int(se))
            lat, lon = position_for_hour(
                int(h), home_lat[i], home_lon[i], work_lat[i], work_lon[i], rng
            )
            records.append((device_ids[i], round(lat, 6), round(lon, 6), ts))

    df = pd.DataFrame(records, columns=["device_id", "latitude", "longitude", "timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    df.to_csv(output_path, index=False)
    return df


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic GeoPulse GPS ping data.")
    parser.add_argument("--num-devices", type=int, default=7000,
                         help="Unique devices to simulate (default: 7000, within the 5K-10K target)")
    parser.add_argument("--num-pings", type=int, default=100000,
                         help="Total GPS ping records to generate (default: 100000)")
    parser.add_argument("--date", type=str, default="2026-09-08",
                         help="Simulation date, YYYY-MM-DD (default: 2026-09-08, a weekday)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--output", type=str, default="geopulse_gps_pings.csv",
                         help="Output CSV path")
    args = parser.parse_args()

    sim_date = datetime.strptime(args.date, "%Y-%m-%d")

    df = generate(args.num_devices, args.num_pings, sim_date, args.seed, args.output)

    print(f"City: {CITY_NAME}  (lat {LAT_MIN}-{LAT_MAX}, lon {LON_MIN}-{LON_MAX})")
    print(f"Devices: {args.num_devices}")
    print(f"Pings generated: {len(df)}")
    print(f"Unique devices in output: {df['device_id'].nunique()}")
    print(f"Date simulated: {args.date}")
    print(f"Output written to: {args.output}")


if __name__ == "__main__":
    main()
