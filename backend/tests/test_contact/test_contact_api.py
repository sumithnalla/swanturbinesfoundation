"""
Tests for Contact submission endpoint.
"""
from unittest.mock import AsyncMock, MagicMock
from bson import ObjectId
from fastapi.testclient import TestClient


def test_submit_contact_message(client: TestClient, mock_db):
    mock_db.contact_submissions.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))

    payload = {
        "first_name": "Suresh",
        "last_name": "Reddy",
        "email": "suresh@example.com",
        "phone": "9876543210",
        "subject": "Inquiry regarding rural water project partnership",
        "message": "We would like to coordinate volunteer efforts in our rural block.",
    }

    response = client.post("/api/v1/contact", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "Thank you for contacting us" in data["message"]
