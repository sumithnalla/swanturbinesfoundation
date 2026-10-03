"""
Tests for health and root endpoints.
"""
from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Swan Turbines Foundation API"
    assert data["status"] == "running"
    assert "version" in data
    assert "environment" in data


def test_health_check_ok(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "ok"
