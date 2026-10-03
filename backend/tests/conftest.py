"""
Pytest configuration and shared fixtures for backend tests.
"""
import pytest
from collections import defaultdict
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_db, get_gridfs


class AsyncMockCursor:
    def __init__(self, items=None):
        self.items = list(items or [])
        self._index = 0

    def sort(self, *args, **kwargs):
        return self

    def skip(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def __aiter__(self):
        self._index = 0
        return self

    async def __anext__(self):
        if self._index < len(self.items):
            item = self.items[self._index]
            self._index += 1
            return item
        raise StopAsyncIteration

    async def to_list(self, *args, **kwargs):
        return self.items


class AsyncMockCollection:
    def __init__(self):
        self.find_one = AsyncMock(return_value=None)
        self.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
        self.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
        self.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
        self.count_documents = AsyncMock(return_value=0)
        self.create_index = AsyncMock()
        self.find_one_and_update = AsyncMock(return_value={"value": 1})
        self.aggregate = MagicMock()
        self._cursor = AsyncMockCursor()
        self.find = MagicMock(side_effect=lambda *args, **kwargs: self._cursor)


class MockDatabase:
    def __init__(self):
        self._collections = defaultdict(AsyncMockCollection)
        self.command = AsyncMock(return_value={"ok": 1})

    def __getitem__(self, name):
        return self._collections[name]

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self._collections[name]


@pytest.fixture
def mock_db():
    return MockDatabase()


@pytest.fixture
def client(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    with patch("app.main.connect_db", new_callable=AsyncMock), \
         patch("app.main.disconnect_db", new_callable=AsyncMock):
        with TestClient(app, base_url="http://test") as c:
            yield c
    app.dependency_overrides.clear()
