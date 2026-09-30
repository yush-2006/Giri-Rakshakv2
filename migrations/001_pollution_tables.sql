CREATE TABLE IF NOT EXISTS environmental_observations (
    id SERIAL PRIMARY KEY,
    location_name VARCHAR(120),
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    pollutant VARCHAR(30) NOT NULL,
    value DOUBLE PRECISION,
    unit VARCHAR(30) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'demo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_environmental_observations_pollutant
    ON environmental_observations (pollutant);

CREATE INDEX IF NOT EXISTS ix_environmental_observations_observed_at
    ON environmental_observations (observed_at);

CREATE TABLE IF NOT EXISTS hotspots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    pollutant VARCHAR(30) NOT NULL,
    intensity DOUBLE PRECISION,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    detected_at TIMESTAMPTZ NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'demo'
);

CREATE INDEX IF NOT EXISTS ix_hotspots_pollutant
    ON hotspots (pollutant);

CREATE INDEX IF NOT EXISTS ix_hotspots_severity
    ON hotspots (severity);

CREATE TABLE IF NOT EXISTS forecast_runs (
    id SERIAL PRIMARY KEY,
    location_name VARCHAR(120),
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    pollutant VARCHAR(30) NOT NULL,
    forecast_value DOUBLE PRECISION,
    unit VARCHAR(30) NOT NULL,
    forecast_for TIMESTAMPTZ NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    model_name VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS ix_forecast_runs_pollutant
    ON forecast_runs (pollutant);

CREATE INDEX IF NOT EXISTS ix_forecast_runs_forecast_for
    ON forecast_runs (forecast_for);