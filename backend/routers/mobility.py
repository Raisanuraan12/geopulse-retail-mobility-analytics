from fastapi import APIRouter

from services.mobility_service import (
    get_mobility_summary,
    get_hourly_footfall,
    get_peak_traffic,
    get_traffic_periods
)

router = APIRouter(
    prefix="/mobility",
    tags=["Mobility Analytics"]
)


@router.get("/summary")
def mobility_summary():
    summary = get_mobility_summary()

    return {
        "status": "success",
        "message": "GeoPulse mobility analytics summary",
        "data": summary
    }


@router.get("/stores")
def get_stores():
    return {
        "status": "success",
        "count": 0,
        "stores": []
    }


@router.get("/footfall")
def get_footfall():
    footfall = get_hourly_footfall()

    return {
        "status": "success",
        "count": len(footfall),
        "footfall": footfall
    }


@router.get("/peak-traffic")
def peak_traffic():
    peak = get_peak_traffic()

    return {
        "status": "success",
        "peak_traffic": peak
    }


@router.get("/traffic-periods")
def traffic_periods():
    periods = get_traffic_periods()

    return {
        "status": "success",
        "count": len(periods),
        "traffic_periods": periods
    }