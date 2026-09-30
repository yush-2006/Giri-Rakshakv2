from datetime import datetime, timedelta, timezone

from database import Base, SessionLocal, engine
from models import EnvironmentalObservation, ForecastRun, Hotspot


# Create missing tables automatically for local/demo setup.
Base.metadata.create_all(bind=engine)


def seed_pollution_data():
    db = SessionLocal()

    try:
        # Remove only previously seeded demo records.
        # Real/non-demo data is untouched.
        db.query(EnvironmentalObservation).filter(
            EnvironmentalObservation.source == "demo"
        ).delete(synchronize_session=False)

        db.query(Hotspot).filter(
            Hotspot.source == "demo"
        ).delete(synchronize_session=False)

        db.query(ForecastRun).filter(
            ForecastRun.model_name == "demo-forecast-v1"
        ).delete(synchronize_session=False)

        now = datetime.now(timezone.utc)

        # ========================================================
        # ENVIRONMENTAL OBSERVATIONS
        # ========================================================

        observations = [
            EnvironmentalObservation(
                location_name="Delhi Demo Zone",
                lat=28.6139,
                lon=77.2090,
                pollutant="PM2.5",
                value=84.5,
                unit="µg/m³",
                observed_at=now - timedelta(hours=1),
                source="demo",
            ),
            EnvironmentalObservation(
                location_name="Delhi Demo Zone",
                lat=28.6139,
                lon=77.2090,
                pollutant="PM10",
                value=142.0,
                unit="µg/m³",
                observed_at=now - timedelta(hours=1),
                source="demo",
            ),
            EnvironmentalObservation(
                location_name="Noida Demo Zone",
                lat=28.5355,
                lon=77.3910,
                pollutant="NO2",
                value=58.2,
                unit="µg/m³",
                observed_at=now - timedelta(hours=2),
                source="demo",
            ),
            EnvironmentalObservation(
                location_name="Ghaziabad Demo Zone",
                lat=28.6692,
                lon=77.4538,
                pollutant="SO2",
                value=31.7,
                unit="µg/m³",
                observed_at=now - timedelta(hours=2),
                source="demo",
            ),
            EnvironmentalObservation(
                location_name="Gurugram Demo Zone",
                lat=28.4595,
                lon=77.0266,
                pollutant="CO",
                value=1.8,
                unit="mg/m³",
                observed_at=now - timedelta(hours=3),
                source="demo",
            ),
            EnvironmentalObservation(
                location_name="Faridabad Demo Zone",
                lat=28.4089,
                lon=77.3178,
                pollutant="O3",
                value=71.4,
                unit="µg/m³",
                observed_at=now - timedelta(hours=3),
                source="demo",
            ),
        ]

        db.add_all(observations)

        # ========================================================
        # HOTSPOTS
        # ========================================================

        hotspots = [
            Hotspot(
                name="Delhi Central Hotspot",
                lat=28.6139,
                lon=77.2090,
                pollutant="PM2.5",
                intensity=88.5,
                severity="high",
                detected_at=now - timedelta(hours=1),
                source="demo",
            ),
            Hotspot(
                name="Noida Traffic Hotspot",
                lat=28.5355,
                lon=77.3910,
                pollutant="NO2",
                intensity=73.2,
                severity="medium",
                detected_at=now - timedelta(hours=2),
                source="demo",
            ),
            Hotspot(
                name="Ghaziabad Industrial Hotspot",
                lat=28.6692,
                lon=77.4538,
                pollutant="PM10",
                intensity=81.7,
                severity="high",
                detected_at=now - timedelta(hours=2),
                source="demo",
            ),
        ]

        db.add_all(hotspots)

        # ========================================================
        # FORECASTS
        # ========================================================

        forecasts = [
            ForecastRun(
                location_name="Delhi Demo Zone",
                lat=28.6139,
                lon=77.2090,
                pollutant="PM2.5",
                forecast_value=96.0,
                unit="µg/m³",
                forecast_for=now + timedelta(hours=6),
                generated_at=now,
                model_name="demo-forecast-v1",
            ),
            ForecastRun(
                location_name="Noida Demo Zone",
                lat=28.5355,
                lon=77.3910,
                pollutant="NO2",
                forecast_value=64.5,
                unit="µg/m³",
                forecast_for=now + timedelta(hours=6),
                generated_at=now,
                model_name="demo-forecast-v1",
            ),
            ForecastRun(
                location_name="Ghaziabad Demo Zone",
                lat=28.6692,
                lon=77.4538,
                pollutant="PM10",
                forecast_value=151.0,
                unit="µg/m³",
                forecast_for=now + timedelta(hours=12),
                generated_at=now,
                model_name="demo-forecast-v1",
            ),
        ]

        db.add_all(forecasts)

        db.commit()

        print("Pollution demo data seeded successfully.")
        print(f"Observations: {len(observations)}")
        print(f"Hotspots: {len(hotspots)}")
        print(f"Forecasts: {len(forecasts)}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_pollution_data()