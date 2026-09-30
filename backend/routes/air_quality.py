import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/air-quality", tags=["Air Quality"])

PREDICTIONS_FILE = (
    Path(__file__).resolve().parents[2]
    / "ml"
    / "air_quality"
    / "outputs"
    / "latest_predictions.json"
)


@router.get("/predictions")
def get_air_quality_predictions():
    if not PREDICTIONS_FILE.exists():
        raise HTTPException(
            status_code=503,
            detail="Air-quality prediction file is not available.",
        )

    try:
        with PREDICTIONS_FILE.open("r", encoding="utf-8") as file:
            predictions = json.load(file)
    except (OSError, json.JSONDecodeError):
        raise HTTPException(
            status_code=500,
            detail="Could not read air-quality predictions.",
        )

    return {
        "data_source": "synthetic_demo",
        "is_official_aqi": False,
        "predictions": predictions,
    }