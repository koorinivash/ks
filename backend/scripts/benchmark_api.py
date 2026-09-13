"""Read-only HTTP benchmark, or isolated synthetic ASGI benchmark (never seeds Atlas)."""
import argparse
import asyncio
import json
import logging
import os
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx


async def run(args):
    transport = None
    person_id = None
    atlas_client = None
    if getattr(args, "atlas", False):
        from motor.motor_asyncio import AsyncIOMotorClient
        from app.config import get_settings
        from app.database.mongodb import database
        from app.main import app
        settings = get_settings()
        atlas_client = AsyncIOMotorClient(
            settings.mongodb_uri, minPoolSize=settings.mongodb_min_pool_size,
            maxPoolSize=settings.mongodb_max_pool_size, serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000, socketTimeoutMS=15000, waitQueueTimeoutMS=5000,
        )
        database.client = atlas_client
        database.db = atlas_client[settings.database_name]
        # Deliberately bypass lifespan: no index creation or data writes.
        transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    elif not args.url:
        os.environ["MONGODB"] = "5.0.5"
        from mongomock_motor import AsyncMongoMockClient
        from app.database.mongodb import database, create_indexes
        from app.main import app
        from app.models.person import new_person_document
        from app.models.monthly_record import new_monthly_record_document

        database.client = AsyncMongoMockClient()
        database.db = database.client["benchmark_only"]
        await create_indexes()
        for i in range(50):
            result = await database.db.people.insert_one(new_person_document(
                f"Synthetic {i:03}", None, 1000, 1, "active"
            ))
            person_id = str(result.inserted_id)
            for month in range(1, 13):
                await database.db.monthly_records.insert_one(new_monthly_record_document(
                    result.inserted_id, month, 2026, 1000, 400, "partial",
                    datetime(2026, month, 13, 12, tzinfo=timezone.utc), None
                ))
        transport = httpx.ASGITransport(app=app)
    logging.disable(logging.CRITICAL)
    results = {"mode": "remote HTTP, read-only" if args.url else "in-process ASGI + mongomock, 50 people / 600 records; no network or real indexes", "endpoints": {}}
    if atlas_client is not None:
        results["mode"] = "local updated ASGI + live Atlas, read-only; excludes Render and mobile network"
    async with httpx.AsyncClient(base_url=args.url or "http://test", transport=transport, timeout=30) as client:
        paths = ["/health", "/api/people", "/api/dashboard?month=9&year=2026", "/api/monthly-records?month=9&year=2026"]
        for path in paths:
            samples = []
            for _ in range(args.samples + 1):
                started = perf_counter()
                try:
                    response = await client.get(path)
                    elapsed = round((perf_counter() - started) * 1000, 2)
                    if response.status_code != 200:
                        results["endpoints"][path] = {"status": response.status_code, "elapsed_ms": elapsed}
                        break
                    samples.append(elapsed)
                    if path == "/api/people" and response.json():
                        person_id = response.json()[0]["id"]
                except httpx.HTTPError as error:
                    results["endpoints"][path] = {"error": type(error).__name__}
                    break
            else:
                results["endpoints"][path] = {"first_ms": samples[0], "warm_median_ms": round(statistics.median(samples[1:]), 2), "bytes": len(response.content)}
        if person_id:
            samples = []
            for _ in range(args.samples + 1):
                started = perf_counter()
                try:
                    response = await client.get(f"/api/people/{person_id}")
                    response.raise_for_status()
                    samples.append(round((perf_counter() - started) * 1000, 2))
                except httpx.HTTPError as error:
                    results["endpoints"]["/api/people/{id}"] = {"error": type(error).__name__}
                    break
            else:
                results["endpoints"]["/api/people/{id}"] = {"first_ms": samples[0], "warm_median_ms": round(statistics.median(samples[1:]), 2)}
    print(json.dumps(results, indent=2))
    if atlas_client is not None:
        atlas_client.close()
    if args.output:
        Path(args.output).write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", help="Remote API base URL; GET requests only. Omit for synthetic benchmark.")
    parser.add_argument("--atlas", action="store_true", help="Run local ASGI GET requests against configured Atlas, without index creation or writes.")
    parser.add_argument("--samples", type=int, default=3)
    parser.add_argument("--output")
    args = parser.parse_args()
    if args.samples < 1:
        parser.error("--samples must be at least 1")
    if args.atlas and args.url:
        parser.error("--atlas and --url are mutually exclusive")
    asyncio.run(run(args))
