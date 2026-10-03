"""
Tests for Help Request API endpoints.
"""
from unittest.mock import AsyncMock, MagicMock
from bson import ObjectId
from fastapi.testclient import TestClient


def test_submit_help_request(client: TestClient, mock_db):
    req_id = ObjectId()
    # Mock counter for atomic reference generation
    mock_db.counters.find_one_and_update = AsyncMock(return_value={"seq": 1})
    mock_db.help_requests.insert_one = AsyncMock(return_value=MagicMock(inserted_id=req_id))
    mock_db.audit_logs.insert_one = AsyncMock()

    payload = {
        "applicant": {
            "full_name": "Ramesh Kumar",
            "mobile": "9876543210",
            "email": "ramesh@example.com",
            "address": "Village Kondapur, Medak",
            "city": "Medak",
            "state": "Telangana",
        },
        "request": {
            "support_type": "medical",
            "description": "Urgent financial support requested for kidney dialysis medical procedures.",
            "beneficiaries": 1,
            "amount_required": "45000",
            "urgency": "urgent",
        },
        "consent": True,
    }

    response = client.post("/api/v1/requests", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "reference" in data
    assert data["reference"].startswith("STF-2026-")
    assert data["status"] == "pending"


def test_track_request_by_reference(client: TestClient, mock_db):
    mock_request = {
        "_id": ObjectId(),
        "reference": "STF-2026-000001",
        "status": "under_review",
        "request": {
            "support_type": "medical",
            "urgency": "normal",
        },
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-02T00:00:00Z",
    }
    mock_db.help_requests.find_one = AsyncMock(return_value=mock_request)

    response = client.get("/api/v1/requests/track/STF-2026-000001")
    assert response.status_code == 200
    data = response.json()
    assert data["reference"] == "STF-2026-000001"
    assert data["status"] == "under_review"
