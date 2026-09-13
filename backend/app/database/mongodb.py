import logging
import asyncio
from time import perf_counter

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings

logger = logging.getLogger("ks_finance.database")


class Database:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


database = Database()


async def connect_to_mongo() -> None:
    if database.client is not None:
        return
    settings = get_settings()
    started = perf_counter()
    database.client = AsyncIOMotorClient(
        settings.mongodb_uri,
        minPoolSize=settings.mongodb_min_pool_size,
        maxPoolSize=settings.mongodb_max_pool_size,
        serverSelectionTimeoutMS=settings.mongodb_server_selection_timeout_ms,
        connectTimeoutMS=settings.mongodb_connect_timeout_ms,
        socketTimeoutMS=settings.mongodb_socket_timeout_ms,
        waitQueueTimeoutMS=settings.mongodb_wait_queue_timeout_ms,
        appname="ks-finance",
    )
    database.db = database.client[settings.database_name]
    try:
        if settings.mongodb_create_indexes_on_startup:
            await create_indexes()
        else:
            await database.client.admin.command("ping")
    except Exception:
        await close_mongo_connection()
        raise
    logger.info("MongoDB startup completed in %.1fms", (perf_counter() - started) * 1000)


async def close_mongo_connection() -> None:
    if database.client is not None:
        database.client.close()
        database.client = None
        database.db = None
        logger.info("MongoDB connection closed")


async def create_indexes() -> None:
    assert database.db is not None
    people = database.db["people"]
    monthly_records = database.db["monthly_records"]

    # Keep existing indexes; avoid an automatic destructive index migration.
    await asyncio.gather(
        people.create_index("name"),
        people.create_index([("status", 1), ("name", 1), ("_id", 1)]),
        people.create_index([("name", 1), ("_id", 1)]),
        monthly_records.create_index("person_id"),
        monthly_records.create_index("year"),
        monthly_records.create_index("month"),
        monthly_records.create_index([("year", 1), ("month", 1)]),
        monthly_records.create_index(
            [("person_id", 1), ("year", 1), ("month", 1)], unique=True
        ),
    )


def get_database() -> AsyncIOMotorDatabase:
    assert database.db is not None, "Database not initialized"
    return database.db
