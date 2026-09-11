from fastapi import APIRouter
from services.mobility_service import (
    get_mobility_summary,
    get_hourly_footfall
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

