"""
Tests for Admin & WEBSITTER Manage API endpoints.
"""
from unittest.mock import AsyncMock, MagicMock
from bson import ObjectId
from fastapi.testclient import TestClient

from app.main import app
from app.core.dependencies import require_permission, get_current_user
from tests.conftest import AsyncMockCursor


def test_admin_dashboard_success(client: TestClient, mock_db):
    app.dependency_overrides[require_permission("requests.read")] = lambda: {
        "_id": ObjectId(),
        "email": "websitter@swanturbinesfoundation.com",
        "full_name": "WEBSITTER Super Admin"
    }

    mock_cursor = AsyncMockCursor([
        {"_id": "new", "count": 5},
        {"_id": "in_review", "count": 3}
    ])
    mock_db.help_requests.aggregate = MagicMock(return_value=mock_cursor)
    mock_db.campaigns.count_documents = AsyncMock(side_effect=[8, 2])

    response = client.get("/api/v1/admin/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "requests" in data
    assert "campaigns" in data
    assert data["requests"]["total"] == 8
    assert data["campaigns"]["active"] == 8
    assert data["campaigns"]["completed"] == 2

    app.dependency_overrides.pop(require_permission("requests.read"), None)


def test_admin_list_users(client: TestClient, mock_db):
    app.dependency_overrides[require_permission("users.read")] = lambda: {
        "_id": ObjectId(),
        "email": "websitter@swanturbinesfoundation.com"
    }

    u1_id = ObjectId()
    u2_id = ObjectId()
    mock_db.users._cursor = AsyncMockCursor([
        {
            "_id": u1_id,
            "full_name": "WEBSITTER Super Admin",
            "email": "websitter@swanturbinesfoundation.com",
            "is_active": True,
            "role_ids": [ObjectId()],
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "_id": u2_id,
            "full_name": "Foundation Staff",
            "email": "staff@swanturbinesfoundation.com",
            "is_active": True,
            "role_ids": [],
            "created_at": "2026-01-02T00:00:00Z"
        }
    ])

    response = client.get("/api/v1/admin/users")
    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert len(data["users"]) == 2
    assert data["users"][0]["email"] == "websitter@swanturbinesfoundation.com"

    app.dependency_overrides.pop(require_permission("users.read"), None)


def test_admin_create_user(client: TestClient, mock_db):
    app.dependency_overrides[require_permission("users.manage")] = lambda: {
        "_id": ObjectId(),
        "email": "websitter@swanturbinesfoundation.com"
    }

    mock_db.users.find_one = AsyncMock(return_value=None)
    mock_db.users.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
    mock_db.audit_logs.insert_one = AsyncMock()

    response = client.post(
        "/api/v1/admin/users",
        json={
            "full_name": "New Reviewer",
            "email": "reviewer@swanturbinesfoundation.com",
            "password": "Password123#Secure",
            "role_ids": []
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    assert data["user"]["email"] == "reviewer@swanturbinesfoundation.com"

    app.dependency_overrides.pop(require_permission("users.manage"), None)


def test_admin_toggle_user_status(client: TestClient, mock_db):
    app.dependency_overrides[require_permission("users.manage")] = lambda: {
        "_id": ObjectId(),
        "email": "websitter@swanturbinesfoundation.com"
    }

    target_id = ObjectId()
    mock_db.users.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))

    response = client.patch(
        f"/api/v1/admin/users/{str(target_id)}/status",
        json={"is_active": False}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["updated"] is True
    assert data["is_active"] is False

    app.dependency_overrides.pop(require_permission("users.manage"), None)


def test_admin_list_roles(client: TestClient, mock_db):
    app.dependency_overrides[require_permission("roles.read")] = lambda: {
        "_id": ObjectId(),
        "email": "websitter@swanturbinesfoundation.com"
    }

    role_id = ObjectId()
    mock_db.roles._cursor = AsyncMockCursor([
        {
            "_id": role_id,
            "name": "super_admin",
            "description": "Super admin full access",
            "permissions": ["*"]
        }
    ])

    response = client.get("/api/v1/admin/roles")
    assert response.status_code == 200
    data = response.json()
    assert "roles" in data
    assert len(data["roles"]) == 1
    assert data["roles"][0]["name"] == "super_admin"

    app.dependency_overrides.pop(require_permission("roles.read"), None)


def test_admin_audit_logs(client: TestClient, mock_db):
    app.dependency_overrides[require_permission("audit.read")] = lambda: {
        "_id": ObjectId(),
        "email": "websitter@swanturbinesfoundation.com"
    }

    mock_db.audit_logs._cursor = AsyncMockCursor([
        {
            "_id": ObjectId(),
            "actor_id": "usr_123",
            "action": "auth.login",
            "entity_type": "user",
            "entity_id": "usr_123",
            "ip_address": "127.0.0.1",
            "details": {},
            "created_at": "2026-01-01T00:00:00Z"
        }
    ])
    mock_db.audit_logs.count_documents = AsyncMock(return_value=1)

    response = client.get("/api/v1/admin/audit-logs")
    assert response.status_code == 200
    data = response.json()
    assert "logs" in data
    assert len(data["logs"]) == 1
    assert data["logs"][0]["action"] == "auth.login"

    app.dependency_overrides.pop(require_permission("audit.read"), None)


def test_admin_unauthorized_blocked(client: TestClient):
    # Without authentication or permission override
    response = client.get("/api/v1/admin/users")
    assert response.status_code in (401, 403)
