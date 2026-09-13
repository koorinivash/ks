import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings

logger = logging.getLogger("ks_finance.database")


class Database:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


database = Database()


async def connect_to_mongo() -> None:
    settings = get_settings()
    database.client = AsyncIOMotorClient(settings.mongodb_uri)
    database.db = database.client[settings.database_name]
    await create_indexes()
    logger.info("Connected to MongoDB database '%s'", settings.database_name)


async def close_mongo_connection() -> None:
    if database.client:
        database.client.close()
        logger.info("MongoDB connection closed")


async def create_indexes() -> None:
    assert database.db is not None
    people = database.db["people"]
    monthly_records = database.db["monthly_records"]

    await people.create_index("name")
    await monthly_records.create_index("person_id")
    await monthly_records.create_index("year")
    await monthly_records.create_index("month")
    await monthly_records.create_index(
        [("person_id", 1), ("year", 1), ("month", 1)], unique=True
    )


def get_database() -> AsyncIOMotorDatabase:
    assert database.db is not None, "Database not initialized"
    return database.db
