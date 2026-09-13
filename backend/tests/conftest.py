import asyncio
import os

# mongomock reads the "MONGODB" env var expecting a version string (e.g. "5.0.5"),
# but some systems set MONGODB to an install path, which breaks version parsing.
os.environ["MONGODB"] = "5.0.5"

import pytest
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

from app.database import mongodb
from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
async def mock_database():
    client = AsyncMongoMockClient()
    mongodb.database.client = client
    mongodb.database.db = client["ks_finance_test"]
    await mongodb.create_indexes()
    yield mongodb.database.db
    mongodb.database.client = None
    mongodb.database.db = None


@pytest.fixture
async def client(mock_database):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
