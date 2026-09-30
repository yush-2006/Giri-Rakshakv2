import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/air-quality", tags=["Air Quality"])

BASE_DIR = Path(__file__).resolve().parents[1] / "data"
BRICS_DIR = BASE_DIR / "brics"
INDIA_FILE = BASE_DIR / "india_districts.geojson"

COUNTRIES = {
    "IND": "India",
    "BRA": "Brazil",
    "RUS": "Russia",
    "CHN": "China",
    "ZAF": "South Africa",
    "EGY": "Egypt",
    "ETH": "Ethiopia",
    "IDN": "Indonesia",
    "IRN": "Iran",
    "SAU": "Saudi Arabia",
    "ARE": "United Arab Emirates",
}

@router.get("/regions/{country_code}")
def get_country_regions(country_code: str):
    code = country_code.upper()

    if code not in COUNTRIES:
        raise HTTPException(status_code=404, detail="Unsupported country code")

    file_path = INDIA_FILE if code == "IND" else BRICS_DIR / f"{code}_1.json"

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Region boundary data not found")

    try:
        with file_path.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not read region boundary data"
        ) from exc

    return {
        "country_code": code,
        "country": COUNTRIES[code],
        "data_source": "india_districts" if code == "IND" else "gadm_admin1",
        "is_official_aqi": False,
        "features": data.get("features", []),
    }
