\# Air Quality Forecasting (Demo)



\## Overview

This module demonstrates next-hour PM2.5 forecasting for three illustrative Delhi locations.



IMPORTANT: The dataset is synthetic demo data. Predictions are not live measurements, official AQI, or validated real-world forecasts.



\## Pipeline

\- src/generate\_demo\_data.py: Generates synthetic hourly data.

\- src/train\_forecast.py: Trains a Random Forest model and compares it with a persistence baseline.

\- src/predict.py: Generates next-hour predictions.

\- data/demo\_air\_quality.csv: Synthetic dataset.

\- outputs/pm25\_forecast\_model.joblib: Trained model.

\- outputs/forecast\_metrics.json: Evaluation metrics.

\- outputs/latest\_predictions.json: Sample predictions.



\## Environment

Use Python 3.11 or compatible.

Install dependencies in the isolated virtual environment:



&#x20;   python -m pip install pandas scikit-learn joblib



\## Run

Run these commands from the repository root:



&#x20;   python ml/air\_quality/src/generate\_demo\_data.py

&#x20;   python ml/air\_quality/src/train\_forecast.py

&#x20;   python ml/air\_quality/src/predict.py



\## Evaluation

See outputs/forecast\_metrics.json for MAE and RMSE results.



These metrics are based only on synthetic demo data and do not represent real-world forecasting accuracy.



\## Prediction Fields

Each prediction includes location, coordinates, timestamps, pollutant, predicted value, unit, model version, data source, and official-AQI status.



For this demo:

\- data\_source is synthetic\_demo

\- is\_official\_aqi is false



Display predictions as synthetic demo results, not live sensor readings or official AQI.

