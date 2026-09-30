from pathlib import Path
from datetime import timedelta
import json

import joblib
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "demo_air_quality.csv"
MODEL_PATH = ROOT / "outputs" / "pm25_forecast_model.joblib"
OUTPUT_PATH = ROOT / "outputs" / "latest_predictions.json"


def build_latest_features(df: pd.DataFrame, location_id: str) -> dict:
    location_df = (
        df[df["location_id"] == location_id]
        .sort_values("timestamp")
        .tail(3)
    )

    if len(location_df) < 3:
        raise ValueError(f"Not enough history for {location_id}")

    latest = location_df.iloc[-1]
    previous = location_df.iloc[-2]
    previous_two = location_df.iloc[-3]

    return {
        "pm25": float(latest["pm25"]),
        "pm25_lag_1": float(previous["pm25"]),
        "pm25_lag_2": float(previous_two["pm25"]),
        "pm25_rolling_mean_3": float(location_df["pm25"].mean()),
        "temperature_c": float(latest["temperature_c"]),
        "humidity_pct": float(latest["humidity_pct"]),
        "wind_speed_mps": float(latest["wind_speed_mps"]),
        "hour": int(latest["timestamp"].hour),
        "day_of_week": int(latest["timestamp"].dayofweek),
    }


def main() -> None:
    bundle = joblib.load(MODEL_PATH)
    model = bundle["model"]
    features = bundle["features"]

    df = pd.read_csv(DATA_PATH, parse_dates=["timestamp"])
    predictions = []

    for location_id in sorted(df["location_id"].unique()):
        location_df = df[df["location_id"] == location_id].sort_values("timestamp")
        latest = location_df.iloc[-1]

        feature_values = build_latest_features(df, location_id)
        input_df = pd.DataFrame([feature_values], columns=features)

        predicted_pm25 = float(model.predict(input_df)[0])

        predictions.append(
            {
                "location_id": location_id,
                "latitude": float(latest["latitude"]),
                "longitude": float(latest["longitude"]),
                "last_observed_at": latest["timestamp"].isoformat(),
                "prediction_for": (
                    latest["timestamp"] + timedelta(hours=1)
                ).isoformat(),
                "pollutant": "PM2.5",
                "predicted_value": round(predicted_pm25, 2),
                "unit": "ug/m3",
                "model_version": bundle["model_version"],
                "data_source": "synthetic_demo",
                "is_official_aqi": False,
            }
        )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(predictions, indent=2), encoding="utf-8")

    print(json.dumps(predictions, indent=2))
    print(f"\nSaved predictions to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()