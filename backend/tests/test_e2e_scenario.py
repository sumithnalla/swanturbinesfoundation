"""
Complete End-to-End Scenario Verification Test (Section 42 in specification).
Verifies all 30 steps of the production acceptance workflow.
"""
from unittest.mock import AsyncMock, MagicMock
from bson import ObjectId
from fastapi.testclient import TestClient

from app.core.security import hash_password, create_access_token
from tests.conftest import AsyncMockCursor


def test_complete_e2e_scenario(client: TestClient, mock_db):
    """
    Simulates the complete 30-step end-to-end user & administrator journey:
    1-5. Public website: campaigns listing and dynamic detail
    6-16. Public help request: submission, validation, reference generation, document link
    17-25. Foundation admin: authentication, dashboard stats, request review, status update, audit
    26-28. WEBSITTER manager: audit log telemetry review, user account administration
    29-30. Security: unauthenticated blocking, no password/secret leaks
    """
    # -------------------------------------------------------------
    # Steps 1-5: Public Website & Dynamic Campaigns
    # -------------------------------------------------------------
    camp_id = ObjectId()
    mock_campaign = {
        "_id": camp_id,
        "id": str(camp_id),
        "title": "Youth In Action Against Hunger",
        "slug": "youth-hunger",
        "short_description": "Providing meals to families",
        "description": "Full description of youth hunger campaign",
        "status": "active",
        "category": "hunger",
        "featured": True,
        "display_order": 1,
        "target_amount": 500000.0,
        "raised_amount": 390000.0,
        "currency": "INR",
        "image_url": "swan_foundation_img/youth.png",
        "facts": [{"label": "Meals Provided", "value": "25,000+"}],
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }

    mock_db.campaigns._cursor = AsyncMockCursor([mock_campaign])
    mock_db.campaigns.count_documents = AsyncMock(return_value=1)
    mock_db.campaigns.find_one = AsyncMock(return_value=mock_campaign)

    # 1-3. List campaigns
    res_camps = client.get("/api/v1/campaigns")
    assert res_camps.status_code == 200
    camp_data = res_camps.json()
    assert camp_data["total"] == 1
    c_list = camp_data.get("campaigns") or camp_data.get("items")
    assert c_list[0]["slug"] == "youth-hunger"

    # 4-5. Single campaign detail
    res_single = client.get("/api/v1/campaigns/youth-hunger")
    assert res_single.status_code == 200
    assert res_single.json()["title"] == "Youth In Action Against Hunger"

    # -------------------------------------------------------------
    # Steps 6-16: Help Request Workflow
    # -------------------------------------------------------------
    req_id = ObjectId()
    mock_db.counters.find_one_and_update = AsyncMock(return_value={"seq": 1})
    mock_db.help_requests.insert_one = AsyncMock(return_value=MagicMock(inserted_id=req_id))
    mock_db.audit_logs.insert_one = AsyncMock()

    help_payload = {
        "applicant": {
            "full_name": "Ravi Kumar",
            "mobile": "9876543210",
            "email": "ravi.kumar@example.com",
            "address": "Visakhapatnam, AP",
            "city": "Visakhapatnam",
            "state": "Andhra Pradesh",
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

    # 10-15. Submit request
    res_submit = client.post("/api/v1/requests", json=help_payload)
    assert res_submit.status_code == 201
    submit_data = res_submit.json()
    assert submit_data["status"] == "pending"
    ref_number = submit_data["reference"]
    assert ref_number.startswith("STF-2026-")

    # 14. Track reference by applicant
    stored_request = {
        "_id": req_id,
        "id": str(req_id),
        "reference": ref_number,
        "status": "pending",
        "applicant": help_payload["applicant"],
        "request": help_payload["request"],
        "created_at": "2026-10-03T12:00:00Z",
        "updated_at": "2026-10-03T12:00:00Z",
        "status_history": [{"status": "pending", "changed_at": "2026-10-03T12:00:00Z"}],
    }
    mock_db.help_requests.find_one = AsyncMock(return_value=stored_request)

    res_track = client.get(f"/api/v1/requests/track/{ref_number}")
    assert res_track.status_code == 200
    assert res_track.json()["reference"] == ref_number
    assert res_track.json()["status"] == "pending"

    # -------------------------------------------------------------
    # Steps 17-25: Foundation Admin Login & Review
    # -------------------------------------------------------------
    admin_id = ObjectId()
    admin_role_id = ObjectId()
    mock_admin_user = {
        "_id": admin_id,
        "id": str(admin_id),
        "full_name": "Foundation Admin",
        "email": "admin@swanturbinesfoundation.com",
        "password_hash": hash_password("AdminPass123!"),
        "is_active": True,
        "role_ids": [admin_role_id],
        "failed_attempts": 0,
        "locked_until": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }
    mock_admin_role = {
        "_id": admin_role_id,
        "name": "admin",
        "permissions": ["*"]
    }

    mock_db.users.find_one = AsyncMock(return_value=mock_admin_user)
    mock_db.roles.find = MagicMock(return_value=AsyncMockCursor([mock_admin_role]))

    # 17. Admin logs in
    res_login = client.post("/api/v1/auth/login", json={
        "email": "admin@swanturbinesfoundation.com",
        "password": "AdminPass123!"
    })
    assert res_login.status_code == 200
    assert "access_token" in res_login.cookies
    token_str = res_login.cookies["access_token"]

    # 18. Admin accesses dashboard stats
    mock_db.help_requests.aggregate = MagicMock(return_value=AsyncMockCursor([
        {"_id": "pending", "count": 1}
    ]))
    res_stats = client.get("/api/v1/requests/admin/stats", cookies={"access_token": token_str})
    assert res_stats.status_code == 200
    assert res_stats.json()["total"] == 1

    # 19-22. Admin opens request detail
    mock_db.help_requests.find_one = AsyncMock(return_value=stored_request)
    mock_db.request_documents.count_documents = AsyncMock(return_value=0)
    res_detail = client.get(f"/api/v1/requests/admin/{str(req_id)}", cookies={"access_token": token_str})
    assert res_detail.status_code == 200
    assert res_detail.json()["applicant"]["full_name"] == "Ravi Kumar"

    # 23-25. Admin changes request status (with audit trail)
    updated_doc = {**stored_request, "status": "under_review"}
    mock_db.help_requests.find_one = AsyncMock(return_value=stored_request)
    mock_db.help_requests.find_one_and_update = AsyncMock(return_value=updated_doc)
    mock_db.help_requests.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
    
    res_status = client.patch(
        f"/api/v1/requests/admin/{str(req_id)}/status",
        json={"status": "under_review", "admin_note": "Case assigned for verification"},
        cookies={"access_token": token_str}
    )
    assert res_status.status_code == 200
    assert res_status.json()["status"] == "under_review"

    # -------------------------------------------------------------
    # Steps 26-28: WEBSITTER Super-Admin Management
    # -------------------------------------------------------------
    super_admin_id = ObjectId()
    super_role_id = ObjectId()
    mock_super_user = {
        "_id": super_admin_id,
        "id": str(super_admin_id),
        "full_name": "WEBSITTER Super Admin",
        "email": "websitter@swanturbinesfoundation.com",
        "password_hash": hash_password("SuperSecret2026!"),
        "is_active": True,
        "role_ids": [super_role_id],
        "failed_attempts": 0,
        "locked_until": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }
    mock_super_role = {
        "_id": super_role_id,
        "name": "super_admin",
        "permissions": ["*"]
    }

    mock_db.users.find_one = AsyncMock(return_value=mock_super_user)
    mock_db.roles.find = MagicMock(return_value=AsyncMockCursor([mock_super_role]))

    # 26. WEBSITTER manager logs in
    res_super_login = client.post("/api/v1/auth/login", json={
        "email": "websitter@swanturbinesfoundation.com",
        "password": "SuperSecret2026!"
    })
    assert res_super_login.status_code == 200
    super_token = res_super_login.cookies["access_token"]

    # 27. Manager inspects audit telemetry
    mock_db.audit_logs._cursor = AsyncMockCursor([
        {
            "_id": ObjectId(),
            "actor_id": str(admin_id),
            "action": "request.status_changed",
            "entity_type": "help_request",
            "entity_id": str(req_id),
            "ip_address": "127.0.0.1",
            "created_at": "2026-10-03T12:05:00Z",
            "details": {"new_status": "under_review"}
        }
    ])
    mock_db.audit_logs.count_documents = AsyncMock(return_value=1)
    res_audit = client.get("/api/v1/admin/audit-logs", cookies={"access_token": super_token})
    assert res_audit.status_code == 200
    assert len(res_audit.json()["logs"]) == 1
    assert res_audit.json()["logs"][0]["action"] == "request.status_changed"

    # 28. Manager creates user
    mock_db.users.find_one = AsyncMock(side_effect=[mock_super_user, None, mock_super_user])
    mock_db.users.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
    res_create_user = client.post(
        "/api/v1/admin/users",
        json={
            "full_name": "Field Reviewer",
            "email": "reviewer@swanturbinesfoundation.com",
            "password": "TempPassword123!",
            "role_ids": []
        },
        cookies={"access_token": super_token}
    )
    assert res_create_user.status_code == 200

    # -------------------------------------------------------------
    # Steps 29-30: Security Verification
    # -------------------------------------------------------------
    # 29. Unauthorized request without cookies blocked
    client.cookies.clear()
    res_unauth = client.get("/api/v1/admin/users")
    assert res_unauth.status_code == 401

    # 30. No passwords or secret credentials leaked in response payloads
    mock_db.users._cursor = AsyncMockCursor([mock_admin_user])
    mock_db.users.find_one = AsyncMock(return_value=mock_super_user)
    res_users = client.get("/api/v1/admin/users", cookies={"access_token": super_token})
    assert res_users.status_code == 200
    for u in res_users.json()["users"]:
        assert "password" not in u
        assert "password_hash" not in u
        assert "hashed_password" not in u
