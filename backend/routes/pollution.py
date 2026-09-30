import csv
import io

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from pydantic import ValidationError
from sqlalchemy.orm import Session

from database import get_db
from models import (
    EnvironmentalObservation,
    ForecastRun,
    Hotspot,
)
from schemas import (
    ForecastOut,
    HotspotOut,
    ObservationCreate,
    ObservationImportResult,
    ObservationOut,
)

router = APIRouter(
    prefix="/api/pollution",
    tags=["Pollution"],
)


# ============================================================
# OBSERVATIONS
# ============================================================

@router.post(
    "/observations",
    response_model=ObservationOut,
    status_code=201,
)
def create_observation(
    payload: ObservationCreate,
    db: Session = Depends(get_db),
):
    observation = EnvironmentalObservation(
        location_name=payload.location_name,
        lat=payload.lat,
        lon=payload.lon,
        pollutant=payload.pollutant,
        value=payload.value,
        unit=payload.unit,
        observed_at=payload.observed_at,
        source=payload.source,
    )

    db.add(observation)
    db.commit()
    db.refresh(observation)

    return observation


@router.get(
    "/observations",
    response_model=list[ObservationOut],
)
def get_observations(
    pollutant: str | None = None,
    source: str | None = None,
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    db: Session = Depends(get_db),
):
    query = db.query(EnvironmentalObservation)

    if pollutant:
        query = query.filter(
            EnvironmentalObservation.pollutant == pollutant
        )

    if source:
        query = query.filter(
            EnvironmentalObservation.source == source
        )

    return (
        query
        .order_by(
            EnvironmentalObservation.observed_at.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get(
    "/observations/{observation_id}",
    response_model=ObservationOut,
)
def get_observation(
    observation_id: int,
    db: Session = Depends(get_db),
):
    observation = (
        db.query(EnvironmentalObservation)
        .filter(
            EnvironmentalObservation.id == observation_id
        )
        .first()
    )

    if observation is None:
        raise HTTPException(
            status_code=404,
            detail="Observation not found",
        )

    return observation


# ============================================================
# OBSERVATION CSV IMPORT
# ============================================================

@router.post(
    "/observations/import",
    response_model=ObservationImportResult,
)
async def import_observations(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    MAX_CSV_SIZE = 10 * 1024 * 1024

    # --------------------------------------------------------
    # File validation
    # --------------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="CSV filename is required",
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed",
        )

    content = await file.read(MAX_CSV_SIZE + 1)

    if len(content) > MAX_CSV_SIZE:
        raise HTTPException(
            status_code=413,
            detail="CSV file is too large",
        )

    try:
        csv_text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="CSV must be UTF-8 encoded",
        )

    # --------------------------------------------------------
    # CSV reader
    # --------------------------------------------------------

    reader = csv.DictReader(
        io.StringIO(csv_text)
    )

    required_columns = {
        "location_name",
        "lat",
        "lon",
        "pollutant",
        "value",
        "unit",
        "observed_at",
        "source",
    }

    if not reader.fieldnames:
        raise HTTPException(
            status_code=400,
            detail="CSV file must contain a header row",
        )

    actual_columns = {
        column.strip()
        for column in reader.fieldnames
        if column
    }

    missing_columns = (
        required_columns - actual_columns
    )

    if missing_columns:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Missing required CSV columns",
                "columns": sorted(missing_columns),
            },
        )

    # --------------------------------------------------------
    # Parse rows
    # --------------------------------------------------------

    observations = []
    errors = []

    for row_number, row in enumerate(
        reader,
        start=2,
    ):
        try:
            raw_value = (
                row.get("value") or ""
            ).strip()

            payload = ObservationCreate(
                location_name=(
                    row.get("location_name") or ""
                ).strip() or None,

                lat=float(row["lat"]),

                lon=float(row["lon"]),

                pollutant=(
                    row.get("pollutant") or ""
                ).strip(),

                value=(
                    float(raw_value)
                    if raw_value
                    else None
                ),

                unit=(
                    row.get("unit") or ""
                ).strip(),

                observed_at=(
                    row.get("observed_at") or ""
                ).strip(),

                source=(
                    row.get("source") or "import"
                ).strip() or "import",
            )

            observations.append(
                EnvironmentalObservation(
                    location_name=payload.location_name,
                    lat=payload.lat,
                    lon=payload.lon,
                    pollutant=payload.pollutant,
                    value=payload.value,
                    unit=payload.unit,
                    observed_at=payload.observed_at,
                    source=payload.source,
                )
            )

        except (
            ValueError,
            TypeError,
            ValidationError,
        ) as exc:

            errors.append(
                {
                    "row": row_number,
                    "error": str(exc),
                }
            )

    # --------------------------------------------------------
    # Do not partially import invalid file
    # --------------------------------------------------------

    if errors:
        return {
            "imported": 0,
            "failed": len(errors),
            "errors": errors,
        }

    # --------------------------------------------------------
    # Save valid observations
    # --------------------------------------------------------

    if observations:
        try:
            db.add_all(observations)
            db.commit()

        except Exception:
            db.rollback()

            raise HTTPException(
                status_code=500,
                detail="Failed to save imported observations",
            )

    return {
        "imported": len(observations),
        "failed": 0,
        "errors": [],
    }


# ============================================================
# HOTSPOTS
# ============================================================

@router.get(
    "/hotspots",
    response_model=list[HotspotOut],
)
def get_hotspots(
    pollutant: str | None = None,
    severity: str | None = None,
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    db: Session = Depends(get_db),
):
    query = db.query(Hotspot)

    if pollutant:
        query = query.filter(
            Hotspot.pollutant == pollutant
        )

    if severity:
        query = query.filter(
            Hotspot.severity == severity
        )

    return (
        query
        .order_by(
            Hotspot.detected_at.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get(
    "/hotspots/{hotspot_id}",
    response_model=HotspotOut,
)
def get_hotspot(
    hotspot_id: int,
    db: Session = Depends(get_db),
):
    hotspot = (
        db.query(Hotspot)
        .filter(
            Hotspot.id == hotspot_id
        )
        .first()
    )

    if hotspot is None:
        raise HTTPException(
            status_code=404,
            detail="Hotspot not found",
        )

    return hotspot


# ============================================================
# FORECASTS
# ============================================================

@router.get(
    "/forecasts",
    response_model=list[ForecastOut],
)
def get_forecasts(
    pollutant: str | None = None,
    location_name: str | None = None,
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    db: Session = Depends(get_db),
):
    query = db.query(ForecastRun)

    if pollutant:
        query = query.filter(
            ForecastRun.pollutant == pollutant
        )

    if location_name:
        query = query.filter(
            ForecastRun.location_name == location_name
        )

    return (
        query
        .order_by(
            ForecastRun.forecast_for.asc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get(
    "/forecasts/{forecast_id}",
    response_model=ForecastOut,
)
def get_forecast(
    forecast_id: int,
    db: Session = Depends(get_db),
):
    forecast = (
        db.query(ForecastRun)
        .filter(
            ForecastRun.id == forecast_id
        )
        .first()
    )

    if forecast is None:
        raise HTTPException(
            status_code=404,
            detail="Forecast not found",
        )

    return forecast