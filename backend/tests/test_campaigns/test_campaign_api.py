"""
Tests for Campaign API endpoints.
"""
from unittest.mock import AsyncMock, MagicMock
from bson import ObjectId
from fastapi.testclient import TestClient


def test_get_campaigns_list(client: TestClient, mock_db):
    mock_campaign = {
        "_id": ObjectId(),
        "title": "Clean Water Initiative",
        "slug": "clean-water",
        "short_description": "Clean water project",
        "description": "Providing clean water across rural villages.",
        "category": "Water",
        "status": "active",
        "featured": True,
        "display_order": 1,
        "target_amount": 100000.0,
        "raised_amount": 50000.0,
        "currency": "INR",
        "image_url": "cleanwaterhero.jpeg",
        "facts": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }

    from tests.conftest import AsyncMockCursor
    mock_db.campaigns.find = MagicMock(return_value=AsyncMockCursor([mock_campaign]))
    mock_db.campaigns.count_documents = AsyncMock(return_value=1)

    response = client.get("/api/v1/campaigns")
    assert response.status_code == 200
    data = response.json()
    assert "campaigns" in data
    assert data["total"] == 1
    assert data["campaigns"][0]["slug"] == "clean-water"


def test_get_campaign_by_slug_not_found(client: TestClient, mock_db):
    mock_db.campaigns.find_one = AsyncMock(return_value=None)

    response = client.get("/api/v1/campaigns/non-existent-campaign")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"
