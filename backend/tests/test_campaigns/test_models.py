"""
Tests for Campaign models and validation.
"""
import pytest
from pydantic import ValidationError
from app.models.campaign import CampaignCreate, CampaignStatus


def test_valid_campaign_create():
    camp = CampaignCreate(
        title="Clean Water Initiative",
        slug="clean-water-initiative",
        short_description="Providing safe drinking water to rural communities.",
        description="Full details on the water filtration and distribution network project.",
        category="water",
        status=CampaignStatus.ACTIVE,
        featured=True,
    )
    assert camp.title == "Clean Water Initiative"
    assert camp.slug == "clean-water-initiative"
    assert camp.status == "active"
    assert camp.featured is True


def test_invalid_slug():
    with pytest.raises(ValidationError):
        CampaignCreate(
            title="Clean Water",
            slug="Invalid Slug With Spaces!",
            short_description="Short desc",
            description="Long description here...",
            category="water",
        )
