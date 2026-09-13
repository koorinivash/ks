"""Install the application's indexes once before disabling startup index creation."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings
from app.database.mongodb import connect_to_mongo, close_mongo_connection


async def main():
    get_settings().mongodb_create_indexes_on_startup = True
    try:
        await connect_to_mongo()
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
