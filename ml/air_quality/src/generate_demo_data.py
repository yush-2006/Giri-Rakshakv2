from pathlib import Path

import numpy as np
import pandas as pd


def generate_demo_data(rows: int = 24 * 30, seed: int = 42) -> pd.DataFrame:
    """Generate clearly labeled synthetic hourly air-quality data."""

    rng = np.random.default_rng(seed)
    timestamps = pd.date_range(
        end=pd.Timestamp.now().floor("h"),
        periods=rows,
        freq="h",
    )

    # Demo locations only; these are not live monitoring stations.
    locations = [
        ("Delhi_Central_Demo", 28.6139, 77.2090),
        ("Delhi_East_Demo", 28.6280, 77.2950),
        ("Delhi_South_Demo", 28.5355, 77.2100),
    ]

    records = []

    for location_id, latitude, longitude in locations:
        hour = timestamps.hour.to_numpy()
        day_index = np.arange(rows)

        # Synthetic daily and weekly patterns, not learned from real observations.
        daily_pattern = 22 * np.sin(2 * np.pi * (hour - 7) / 24)
        weekly_pattern = 8 * np.sin(2 * np.pi * day_index / (24 * 7))
        noise = rng.normal(0, 10, rows)

        pm25 = np.clip(75 + daily_pattern + weekly_pattern + noise, 5, 350)
        pm10 = np.clip(pm25 * 1.55 + rng.normal(0, 18, rows), 8, 500)
        temperature = 25 + 7 * np.sin(2 * np.pi * (hour - 6) / 24)
        temperature += rng.normal(0, 1.5, rows)
        humidity = np.clip(55 - 0.7 * (temperature - 25) + rng.normal(0, 8, rows), 15, 95)
        wind_speed = np.clip(rng.gamma(shape=2.0, scale=1.2, size=rows), 0, 12)

        for i, timestamp in enumerate(timestamps):
            records.append(
                {
                    "timestamp": timestamp,
                    "location_id": location_id,
                    "latitude": latitude,
                    "longitude": longitude,
                    "pm25": round(float(pm25[i]), 2),
                    "pm10": round(float(pm10[i]), 2),
                    "temperature_c": round(float(temperature[i]), 2),
                    "humidity_pct": round(float(humidity[i]), 2),
                    "wind_speed_mps": round(float(wind_speed[i]), 2),
                    "data_source": "synthetic_demo",
                }
            )

    return pd.DataFrame(records)


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parents[1]
    output_path = project_root / "data" / "demo_air_quality.csv"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    data = generate_demo_data()
    data.to_csv(output_path, index=False)

    print(f"Generated {len(data)} synthetic demo rows")
    print(f"Saved to: {output_path}")
    print(data.head())