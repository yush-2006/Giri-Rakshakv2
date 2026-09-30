from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "demo_air_quality.csv"
MODEL_PATH = ROOT / "outputs" / "pm25_forecast_model.joblib"
METRICS_PATH = ROOT / "outputs" / "forecast_metrics.json"

FEATURES = [
    "pm25",
    "pm25_lag_1",
    "pm25_lag_2",
    "pm25_rolling_mean_3",
    "temperature_c",
    "humidity_pct",
    "wind_speed_mps",
    "hour",
    "day_of_week",
]


def load_and_prepare_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, parse_dates=["timestamp"])
    df = df.sort_values(["location_id", "timestamp"]).copy()

    grouped = df.groupby("location_id", group_keys=False)

    df["pm25_lag_1"] = grouped["pm25"].shift(1)
    df["pm25_lag_2"] = grouped["pm25"].shift(2)
    df["pm25_rolling_mean_3"] = grouped["pm25"].transform(
        lambda values: values.shift(1).rolling(window=3).mean()
    )

    # Predict the next hourly PM2.5 value.
    df["target_pm25_next_hour"] = grouped["pm25"].shift(-1)

    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek

    df = df.dropna(subset=FEATURES + ["target_pm25_next_hour"])
    return df


def main() -> None:
    df = load_and_prepare_data()

    # Keep each location's latest 20% of rows for testing.
    train_parts = []
    test_parts = []

    for _, location_df in df.groupby("location_id"):
        split_index = int(len(location_df) * 0.8)
        train_parts.append(location_df.iloc[:split_index])
        test_parts.append(location_df.iloc[split_index:])

    train_df = pd.concat(train_parts)
    test_df = pd.concat(test_parts)

    model = RandomForestRegressor(
        n_estimators=150,
        random_state=42,
        min_samples_leaf=2,
        n_jobs=-1,
    )

    model.fit(train_df[FEATURES], train_df["target_pm25_next_hour"])

    predictions = model.predict(test_df[FEATURES])
    actuals = test_df["target_pm25_next_hour"].to_numpy()

    # Simple baseline: next hour equals the current PM2.5 value.
    baseline_predictions = test_df["pm25"].to_numpy()

    metrics = {
        "task": "next_hour_pm25_forecast",
        "data_source": "synthetic_demo",
        "unit": "ug/m3",
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "model_mae": float(mean_absolute_error(actuals, predictions)),
        "model_rmse": float(np.sqrt(mean_squared_error(actuals, predictions))),
        "persistence_baseline_mae": float(
            mean_absolute_error(actuals, baseline_predictions)
        ),
        "persistence_baseline_rmse": float(
            np.sqrt(mean_squared_error(actuals, baseline_predictions))
        ),
        "limitations": [
            "Trained only on synthetic demo data.",
            "Metrics do not represent real-world forecasting performance.",
            "Not an official AQI or regulatory prediction.",
        ],
    }

    ROOT.joinpath("outputs").mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "features": FEATURES,
            "target": "target_pm25_next_hour",
            "model_version": "demo-rf-1",
            "data_source": "synthetic_demo",
        },
        MODEL_PATH,
    )

    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print("Training complete.")
    print(f"Model saved: {MODEL_PATH}")
    print(f"Metrics saved: {METRICS_PATH}")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()