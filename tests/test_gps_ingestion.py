"""
Unit tests for the GPS ingestion module.
Run with: pytest tests/test_gps_ingestion.py -v
"""

import csv
import json
import os
import tempfile
import pytest

# We import from src – adjust sys.path if needed
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.ingestion.gps_ingestion import validate_row, load_gps_csv, save_as_json


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

VALID_ROW = {
    "device_id": "dev_001",
    "latitude": "28.6139",
    "longitude": "77.2090",
    "timestamp": "2024-06-15T08:30:00",
    "accuracy_meters": "12.5",
}


def make_csv(rows: list[dict], path: str) -> None:
    """Helper to write a CSV file for testing."""
    if not rows:
        return
    fieldnames = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


# ---------------------------------------------------------------------------
# validate_row tests
# ---------------------------------------------------------------------------

class TestValidateRow:
    def test_valid_row_passes(self):
        assert validate_row(VALID_ROW) is True

    def test_invalid_latitude_too_high(self):
        row = {**VALID_ROW, "latitude": "95.0"}
        assert validate_row(row) is False

    def test_invalid_longitude_too_low(self):
        row = {**VALID_ROW, "longitude": "-200.0"}
        assert validate_row(row) is False

    def test_accuracy_exceeds_threshold(self):
        row = {**VALID_ROW, "accuracy_meters": "150.0"}
        assert validate_row(row) is False

    def test_bad_timestamp_format(self):
        row = {**VALID_ROW, "timestamp": "not-a-date"}
        assert validate_row(row) is False

    def test_missing_key_returns_false(self):
        row = {"device_id": "x", "latitude": "10.0"}
        assert validate_row(row) is False

    def test_non_numeric_lat_returns_false(self):
        row = {**VALID_ROW, "latitude": "abc"}
        assert validate_row(row) is False


# ---------------------------------------------------------------------------
# load_gps_csv tests
# ---------------------------------------------------------------------------

class TestLoadGpsCsv:
    def test_loads_valid_file(self):
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, encoding="utf-8"
        ) as f:
            tmppath = f.name

        make_csv([VALID_ROW], tmppath)
        try:
            records = load_gps_csv(tmppath)
            assert len(records) == 1
            assert records[0]["device_id"] == "dev_001"
            assert isinstance(records[0]["latitude"], float)
        finally:
            os.unlink(tmppath)

    def test_skips_invalid_rows(self):
        bad_row = {**VALID_ROW, "latitude": "999.0"}
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, encoding="utf-8"
        ) as f:
            tmppath = f.name

        make_csv([VALID_ROW, bad_row], tmppath)
        try:
            records = load_gps_csv(tmppath)
            assert len(records) == 1
        finally:
            os.unlink(tmppath)

    def test_raises_on_missing_file(self):
        with pytest.raises(FileNotFoundError):
            load_gps_csv("/nonexistent/path/gps.csv")

    def test_raises_on_missing_columns(self):
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, encoding="utf-8"
        ) as f:
            f.write("device_id,latitude\ndev_001,28.6\n")
            tmppath = f.name

        try:
            with pytest.raises(ValueError, match="missing required columns"):
                load_gps_csv(tmppath)
        finally:
            os.unlink(tmppath)


# ---------------------------------------------------------------------------
# save_as_json tests
# ---------------------------------------------------------------------------

class TestSaveAsJson:
    def test_saves_and_reloads(self):
        records = [
            {"device_id": "dev_001", "latitude": 28.6, "longitude": 77.2}
        ]
        with tempfile.NamedTemporaryFile(
            suffix=".json", delete=False
        ) as f:
            tmppath = f.name

        try:
            save_as_json(records, tmppath)
            with open(tmppath) as f:
                loaded = json.load(f)
            assert loaded == records
        finally:
            os.unlink(tmppath)


# Week 4 Day 1 - Airflow ingestion compatibility tests

def test_loads_geopulse_four_column_dataset(tmp_path):
    csv_file = tmp_path / "gps.csv"

    csv_file.write_text(
        "device_id,latitude,longitude,timestamp\n"
        "DEV-001,18.611205,73.910369,2026-09-08 00:00:03\n",
        encoding="utf-8",
    )

    records = load_gps_csv(str(csv_file))

    assert len(records) == 1
    assert records[0]["device_id"] == "DEV-001"
    assert records[0]["latitude"] == 18.611205
    assert "accuracy_meters" not in records[0]


def test_save_json_creates_missing_directory(tmp_path):
    output_file = tmp_path / "validated" / "gps.json"

    save_as_json([{"device_id": "DEV-001"}], str(output_file))

    assert output_file.exists()

    with output_file.open(encoding="utf-8") as f:
        assert json.load(f)[0]["device_id"] == "DEV-001"