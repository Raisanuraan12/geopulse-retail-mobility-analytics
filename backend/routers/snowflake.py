from fastapi import APIRouter, HTTPException

from services.snowflake_service import (
    test_snowflake_connection,
    get_snowflake_mobility_points,
    get_snowflake_stores,
)


router = APIRouter(
    prefix="/snowflake",
    tags=["Snowflake"]
)


@router.get("/health")
def snowflake_health():
    try:
        connection_info = test_snowflake_connection()

        return {
            "status": "success",
            "snowflake": connection_info
        }

    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail=f"Snowflake connection unavailable: {str(error)}"
        )


@router.get("/mobility-points")
def snowflake_mobility_points(limit: int = 1000):
    try:
        points = get_snowflake_mobility_points(limit)

        return {
            "status": "success",
            "source": "snowflake",
            "count": len(points),
            "points": points,
        }

    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail=f"Snowflake mobility data unavailable: {str(error)}"
        )


@router.get("/stores")
def snowflake_stores(limit: int = 100):
    try:
        stores = get_snowflake_stores(limit)

        return {
            "status": "success",
            "source": "snowflake",
            "count": len(stores),
            "stores": stores,
        }

    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail=f"Snowflake store data unavailable: {str(error)}"
        )