from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_create_valid_observation():
    payload = {
        "location_name": "Test Zone",
        "lat": 28.6139,
        "lon": 77.2090,
        "pollutant": "PM2.5",
        "value": 80.0,
        "unit": "µg/m³",
        "observed_at": "2026-09-30T10:00:00Z",
        "source": "test",
    }

    response = client.post(
        "/api/pollution/observations",
        json=payload,
    )

    assert response.status_code == 201

    data = response.json()

    assert data["pollutant"] == "PM2.5"
    assert data["value"] == 80.0
    assert data["unit"] == "µg/m³"


def test_invalid_unit_is_rejected():
    payload = {
        "location_name": "Test Zone",
        "lat": 28.6139,
        "lon": 77.2090,
        "pollutant": "PM2.5",
        "value": 80.0,
        "unit": "INVALID_UNIT",
        "observed_at": "2026-09-30T10:00:00Z",
        "source": "test",
    }

    response = client.post(
        "/api/pollution/observations",
        json=payload,
    )

    assert response.status_code == 422


def test_invalid_coordinates_are_rejected():
    payload = {
        "location_name": "Test Zone",
        "lat": 150.0,
        "lon": 77.2090,
        "pollutant": "PM2.5",
        "value": 80.0,
        "unit": "µg/m³",
        "observed_at": "2026-09-30T10:00:00Z",
        "source": "test",
    }

    response = client.post(
        "/api/pollution/observations",
        json=payload,
    )

    assert response.status_code == 422


def test_invalid_pollutant_is_rejected():
    payload = {
        "location_name": "Test Zone",
        "lat": 28.6139,
        "lon": 77.2090,
        "pollutant": "XYZ",
        "value": 80.0,
        "unit": "µg/m³",
        "observed_at": "2026-09-30T10:00:00Z",
        "source": "test",
    }

    response = client.post(
        "/api/pollution/observations",
        json=payload,
    )

    assert response.status_code == 422


def test_missing_timezone_is_rejected():
    payload = {
        "location_name": "Test Zone",
        "lat": 28.6139,
        "lon": 77.2090,
        "pollutant": "PM2.5",
        "value": 80.0,
        "unit": "µg/m³",
        "observed_at": "2026-09-30T10:00:00",
        "source": "test",
    }

    response = client.post(
        "/api/pollution/observations",
        json=payload,
    )

    assert response.status_code == 422


def test_observations_get():
    response = client.get(
        "/api/pollution/observations"
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_hotspots_get():
    response = client.get(
        "/api/pollution/hotspots"
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_forecasts_get():
    response = client.get(
        "/api/pollution/forecasts"
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)
    