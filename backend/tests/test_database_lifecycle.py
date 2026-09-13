from unittest.mock import AsyncMock, Mock, patch

from app.config import Settings
from app.database import mongodb


async def test_client_reused_configured_and_closed():
    original_client, original_db = mongodb.database.client, mongodb.database.db
    client = Mock()
    client.__getitem__ = Mock(return_value=Mock())
    client.admin.command = AsyncMock()
    settings = Settings(_env_file=None, mongodb_uri="mongodb://localhost:27017",
                        mongodb_create_indexes_on_startup=False)
    mongodb.database.client = mongodb.database.db = None
    try:
        with patch.object(mongodb, "get_settings", return_value=settings), patch.object(
            mongodb, "AsyncIOMotorClient", return_value=client
        ) as factory:
            await mongodb.connect_to_mongo()
            await mongodb.connect_to_mongo()
            assert factory.call_count == 1
            assert factory.call_args.kwargs["maxPoolSize"] == 20
            assert factory.call_args.kwargs["waitQueueTimeoutMS"] == 5000
            client.admin.command.assert_awaited_once_with("ping")
            await mongodb.close_mongo_connection()
            client.close.assert_called_once()
            assert mongodb.database.client is mongodb.database.db is None
    finally:
        mongodb.database.client, mongodb.database.db = original_client, original_db


async def test_indexes_and_unique_month_rule(mock_database):
    people = await mock_database.people.index_information()
    records = await mock_database.monthly_records.index_information()
    assert "status_1_name_1__id_1" in people
    assert "year_1_month_1" in records
    assert records["person_id_1_year_1_month_1"]["unique"] is True


async def test_health_has_no_database_query_and_logs_no_search_data(client, caplog):
    with patch("app.main.get_database", side_effect=AssertionError("unexpected DB access")):
        assert (await client.get("/health")).status_code == 200
    with caplog.at_level("INFO", logger="ks_finance"):
        await client.get("/api/people", params={"search": "PRIVATE_SEARCH_VALUE"})
    messages = [record.getMessage() for record in caplog.records if record.name == "ks_finance"]
    assert any("GET /api/people 200" in message for message in messages)
    assert all("PRIVATE_SEARCH_VALUE" not in message for message in messages)
