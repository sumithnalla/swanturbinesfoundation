"""
Tests for Authentication API endpoints.
"""
from unittest.mock import AsyncMock, MagicMock
from bson import ObjectId
from fastapi.testclient import TestClient

from app.core.security import hash_password, create_access_token


def test_login_success(client: TestClient, mock_db):
    user_id = ObjectId()
    mock_user = {
        "_id": user_id,
        "id": str(user_id),
        "full_name": "Aruna Pothumarthi",
        "email": "aruna@swanturbinesfoundation.com",
        "password_hash": hash_password("ValidPassword123!"),
        "is_active": True,
        "role_ids": [],
        "failed_attempts": 0,
        "locked_until": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }

    mock_db.users.find_one = AsyncMock(return_value=mock_user)
    mock_db.users.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
    mock_db.audit_logs.insert_one = AsyncMock()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "aruna@swanturbinesfoundation.com", "password": "ValidPassword123!"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Login successful."
    assert data["user"]["email"] == "aruna@swanturbinesfoundation.com"
    # Ensure secure cookie was set
    assert "access_token" in response.cookies


def test_login_invalid_password(client: TestClient, mock_db):
    user_id = ObjectId()
    mock_user = {
        "_id": user_id,
        "id": str(user_id),
        "full_name": "Aruna Pothumarthi",
        "email": "aruna@swanturbinesfoundation.com",
        "password_hash": hash_password("ValidPassword123!"),
        "is_active": True,
        "role_ids": [],
        "failed_attempts": 0,
        "locked_until": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }

    mock_db.users.find_one = AsyncMock(return_value=mock_user)
    mock_db.users.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
    mock_db.audit_logs.insert_one = AsyncMock()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "aruna@swanturbinesfoundation.com", "password": "WrongPassword!"}
    )

    assert response.status_code == 401
    data = response.json()
    assert "error" in data


def test_logout(client: TestClient):
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully."
