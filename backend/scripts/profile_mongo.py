"""Read-only ping and explain checks. Prints no URI, query values or customer documents."""
import json
import sys
from pathlib import Path
from time import perf_counter

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pymongo import MongoClient
from app.config import get_settings


def main():
    settings = get_settings()
    result = {}
    try:
        with MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000,
                         connectTimeoutMS=5000, socketTimeoutMS=15000) as client:
            db = client[settings.database_name]
            started = perf_counter()
            client.admin.command("ping")
            result["connect_and_ping_ms"] = round((perf_counter() - started) * 1000, 2)
            started = perf_counter()
            client.admin.command("ping")
            result["warm_ping_ms"] = round((perf_counter() - started) * 1000, 2)
            queries = [
                ("people", {"status": "active"}, {"name": 1, "_id": 1}),
                ("monthly_records", {"year": 2026, "month": 9}, {"year": -1, "month": -1}),
            ]
            person = db.people.find_one({}, {"_id": 1})
            if person:
                queries.append(("monthly_records", {"person_id": person["_id"]}, {"year": -1, "month": -1}))
            result["queries"] = []
            for collection, query, sort in queries:
                plan = db.command("explain", {"find": collection, "filter": query,
                                             "sort": sort, "maxTimeMS": 10000}, verbosity="executionStats")
                stats = plan["executionStats"]
                indexes = set()

                def visit(value):
                    if isinstance(value, dict):
                        if "indexName" in value:
                            indexes.add(value["indexName"])
                        for child in value.values():
                            visit(child)
                    elif isinstance(value, list):
                        for child in value:
                            visit(child)

                visit(plan.get("queryPlanner", {}).get("winningPlan", {}))
                result["queries"].append({
                    "collection": collection, "filter_fields": list(query), "indexes": sorted(indexes),
                    **{key: stats.get(key) for key in ["executionTimeMillis", "totalDocsExamined", "totalKeysExamined", "nReturned"]},
                })
    except Exception as error:
        result["error"] = type(error).__name__
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
