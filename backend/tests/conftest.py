"""
Pytest configuration and shared fixtures for backend tests.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_db, get_gridfs


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.command = AsyncMock(return_value={"ok": 1})
    return db


@pytest.fixture
def client(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    with patch("app.main.connect_db", new_callable=AsyncMock), \
         patch("app.main.disconnect_db", new_callable=AsyncMock):
        with TestClient(app, base_url="http://test") as c:
            yield c
    app.dependency_overrides.clear()
