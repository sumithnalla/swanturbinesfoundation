"""
Tests for Help Request models and validation.
"""
import pytest
from pydantic import ValidationError
from app.models.request import (
    ApplicantInfo,
    RequestInfo,
    HelpRequestCreate,
    RequestStatus,
    RequestUrgency,
    SupportType,
)


def test_valid_request_create():
    applicant = ApplicantInfo(
        full_name="Jane Doe",
        mobile="9876543210",
        email="jane@example.com",
        address="123 Hope Lane",
        city="Hyderabad",
        state="Telangana",
    )
    request_info = RequestInfo(
        support_type=SupportType.MEDICAL,
        description="Urgent assistance needed for chemotherapy treatment expenses.",
        beneficiaries=1,
        amount_required="₹50,000",
        urgency=RequestUrgency.URGENT,
    )
    req = HelpRequestCreate(applicant=applicant, request=request_info, consent=True)
    assert req.applicant.full_name == "Jane Doe"
    assert req.request.support_type == "medical"
    assert req.consent is True


def test_invalid_request_without_consent():
    applicant = ApplicantInfo(
        full_name="Jane Doe",
        mobile="9876543210",
        address="123 Hope Lane",
        city="Hyderabad",
        state="Telangana",
    )
    request_info = RequestInfo(
        support_type=SupportType.MEDICAL,
        description="Urgent assistance needed for chemotherapy treatment expenses.",
        beneficiaries=1,
        amount_required="₹50,000",
        urgency=RequestUrgency.URGENT,
    )
    with pytest.raises(ValidationError):
        HelpRequestCreate(applicant=applicant, request=request_info, consent=False)


def test_request_status_transitions():
    # Valid transitions from pending
    assert RequestStatus.can_transition(RequestStatus.PENDING, RequestStatus.UNDER_REVIEW) is True
    assert RequestStatus.can_transition(RequestStatus.PENDING, RequestStatus.ACCEPTED) is True
    assert RequestStatus.can_transition(RequestStatus.PENDING, RequestStatus.REJECTED) is True

    # Valid transitions from under_review
    assert RequestStatus.can_transition(RequestStatus.UNDER_REVIEW, RequestStatus.ACCEPTED) is True
    assert RequestStatus.can_transition(RequestStatus.UNDER_REVIEW, RequestStatus.REJECTED) is True
    assert RequestStatus.can_transition(RequestStatus.UNDER_REVIEW, RequestStatus.PENDING) is True

    # Terminal states
    assert RequestStatus.can_transition(RequestStatus.ACCEPTED, RequestStatus.PENDING) is False
    assert RequestStatus.can_transition(RequestStatus.REJECTED, RequestStatus.UNDER_REVIEW) is False
