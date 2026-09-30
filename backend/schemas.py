from datetime import datetime, timezone
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    ValidationInfo,
    field_validator,
)


# ============================================================
# EXISTING AUTH / REPORT SCHEMAS
# ============================================================

Role = Literal["citizen", "official"]

ReportStatus = Literal[
    "submitted",
    "verified",
    "in_progress",
    "resolved",
    "rejected",
]

Severity = Literal[
    "low",
    "medium",
    "high",
    "critical",
]


class RegisterCitizen(BaseModel):
    full_name: str = Field(
        min_length=2,
        max_length=120,
    )
    email: EmailStr
    password: str = Field(
        min_length=8,
        max_length=128,
    )
    phone: str | None = Field(
        default=None,
        max_length=20,
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(
        min_length=1,
        max_length=128,
    )
    role: Role


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone: str | None
    role: Role
    department: str | None
    area: str | None
    is_active: bool


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    zone_id: str | None
    lat: float
    lon: float
    photo_path: str | None
    description: str | None
    category: str
    severity: str
    status: str
    assigned_official_id: int | None
    resolution_note: str | None
    reported_at: datetime
    updated_at: datetime


class StatusUpdateRequest(BaseModel):
    status: ReportStatus
    note: str | None = Field(
        default=None,
        max_length=1000,
    )


class AssignReportRequest(BaseModel):
    official_id: int | None = None


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_id: int | None
    alert_id: int | None
    notification_type: str
    title: str
    message: str
    severity: str
    is_read: bool
    created_at: datetime


class DashboardSummary(BaseModel):
    total_reports: int
    submitted_reports: int
    verified_reports: int
    in_progress_reports: int
    resolved_reports: int
    rejected_reports: int
    high_priority_reports: int
    active_alerts: int
    zones_with_data: int
    unread_notifications: int


# ============================================================
# POLLUTION / CLIMATE PLATFORM
# ============================================================

Pollutant = Literal[
    "PM2.5",
    "PM10",
    "NO2",
    "SO2",
    "CO",
    "O3",
]


POLLUTANT_UNITS = {
    "PM2.5": "µg/m³",
    "PM10": "µg/m³",
    "NO2": "µg/m³",
    "SO2": "µg/m³",
    "CO": "mg/m³",
    "O3": "µg/m³",
}


# ============================================================
# ENVIRONMENTAL OBSERVATIONS
# ============================================================

class ObservationCreate(BaseModel):
    location_name: str | None = Field(
        default=None,
        max_length=120,
    )

    lat: float = Field(
        ge=-90,
        le=90,
    )

    lon: float = Field(
        ge=-180,
        le=180,
    )

    pollutant: Pollutant

    value: float | None = Field(
        default=None,
        ge=0,
    )

    unit: str

    observed_at: datetime

    source: str = Field(
        default="demo",
        max_length=50,
    )

    @field_validator("unit")
    @classmethod
    def validate_unit(
        cls,
        value: str,
        info: ValidationInfo,
    ) -> str:
        pollutant = info.data.get("pollutant")

        expected_unit = POLLUTANT_UNITS.get(pollutant)

        if expected_unit is None:
            raise ValueError(
                "Unsupported pollutant"
            )

        if value != expected_unit:
            raise ValueError(
                f"Invalid unit for {pollutant}. "
                f"Expected {expected_unit}."
            )

        return value

    @field_validator("observed_at")
    @classmethod
    def validate_timestamp(
        cls,
        value: datetime,
    ) -> datetime:
        if value.tzinfo is None:
            raise ValueError(
                "observed_at must include timezone information"
            )

        return value.astimezone(timezone.utc)


class ObservationOut(ObservationCreate):
    id: int
    created_at: datetime

    @field_validator(
        "observed_at",
        mode="before",
    )
    @classmethod
    def normalize_output_timestamp(cls, value):
        if value is None:
            return value

        if value.tzinfo is None:
            return value.replace(
                tzinfo=timezone.utc
            )

        return value.astimezone(timezone.utc)

    @field_validator(
        "created_at",
        mode="before",
    )
    @classmethod
    def normalize_created_at(cls, value):
        if value is None:
            return value

        if value.tzinfo is None:
            return value.replace(
                tzinfo=timezone.utc
            )

        return value.astimezone(timezone.utc)


class ObservationImportResult(BaseModel):
    imported: int
    failed: int
    errors: list[dict] = Field(
        default_factory=list
    )


# ============================================================
# HOTSPOTS
# ============================================================

class HotspotOut(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    name: str
    lat: float
    lon: float
    pollutant: str
    intensity: float | None
    severity: str
    detected_at: datetime
    source: str

    @field_validator(
        "detected_at",
        mode="before",
    )
    @classmethod
    def normalize_detected_at(cls, value):
        if value is None:
            return value

        if value.tzinfo is None:
            return value.replace(
                tzinfo=timezone.utc
            )

        return value.astimezone(timezone.utc)


# ============================================================
# FORECASTS
# ============================================================

class ForecastOut(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    location_name: str | None
    lat: float
    lon: float
    pollutant: str
    forecast_value: float | None
    unit: str
    forecast_for: datetime
    generated_at: datetime
    model_name: str | None

    @field_validator(
        "forecast_for",
        "generated_at",
        mode="before",
    )
    @classmethod
    def normalize_forecast_timestamps(cls, value):
        if value is None:
            return value

        if value.tzinfo is None:
            return value.replace(
                tzinfo=timezone.utc
            )

        return value.astimezone(timezone.utc)