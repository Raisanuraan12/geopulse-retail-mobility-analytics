from fastapi import APIRouter

router = APIRouter(
    prefix="/mobility",
    tags=["Mobility Analytics"]
)


@router.get("/summary")
def get_mobility_summary():
    return {
        "status": "success",
        "message": "GeoPulse mobility analytics API is working",
        "data": {
            "total_devices": 0,
            "total_pings": 0,
            "active_stores": 0
        }
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
    return {
        "status": "success",
        "count": 0,
        "footfall": []
    }


@router.get("/cannibalization")
def get_cannibalization():
    return {
        "status": "success",
        "count": 0,
        "cannibalization": []
    }