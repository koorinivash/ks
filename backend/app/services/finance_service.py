from typing import Any
import asyncio
from decimal import Decimal

from bson import Decimal128, ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.monthly_record import compute_status
from app.models.person import get_total_monthly_amount


def calculate_percentage(collected: float, expected: float) -> float:
    if expected <= 0:
        return 0.0
    return round((collected / expected) * 100, 2)


async def get_monthly_report_rows(
    db: AsyncIOMotorDatabase, month: int, year: int
) -> list[dict[str, Any]]:
    """Build one row per active person for the given month, using their monthly
    record if one exists, or falling back to their default monthly amount as the
    expected (pending) amount when no record has been created yet."""
    people, records = await asyncio.gather(
        db["people"].find({"status": "active"}, {
            "name": 1, "default_monthly_amount": 1, "count": 1,
        }).sort("name", 1).to_list(length=None),
        db["monthly_records"].find({"month": month, "year": year}, {
            "person_id": 1, "amount": 1, "paid_amount": 1, "status": 1, "payment_date": 1,
        }).to_list(length=None),
    )
    records_by_person = {str(r["person_id"]): r for r in records}

    rows: list[dict[str, Any]] = []
    for person in people:
        person_id = str(person["_id"])
        record = records_by_person.get(person_id)
        if record:
            expected = record["amount"]
            paid = record.get("paid_amount", 0)
            status = record.get("status") or compute_status(expected, paid)
            record_id = str(record["_id"])
            payment_date = record.get("payment_date")
        else:
            expected = get_total_monthly_amount(person)
            paid = 0
            status = "pending"
            record_id = None
            payment_date = None

        balance = max(expected - paid, 0)
        rows.append(
            {
                "person_id": person_id,
                "record_id": record_id,
                "name": person["name"],
                "expected": expected,
                "paid": paid,
                "balance": balance,
                "status": status,
                "payment_date": payment_date,
            }
        )
    return rows


async def get_full_report_rows(db: AsyncIOMotorDatabase) -> list[dict[str, Any]]:
    """Every monthly record across all time, newest first, joined with person name."""
    records = (
        await db["monthly_records"]
        .find({}, {"person_id": 1, "year": 1, "month": 1, "amount": 1,
                   "paid_amount": 1, "status": 1, "payment_date": 1})
        .sort([("year", -1), ("month", -1)])
        .to_list(length=None)
    )
    person_ids = {r["person_id"] for r in records}
    people = await db["people"].find({"_id": {"$in": list(person_ids)}}, {"name": 1}).to_list(length=None)
    names_by_id = {p["_id"]: p["name"] for p in people}

    rows: list[dict[str, Any]] = []
    for record in records:
        expected = record["amount"]
        paid = record.get("paid_amount", 0)
        balance = max(expected - paid, 0)
        rows.append(
            {
                "person_id": str(record["person_id"]),
                "record_id": str(record["_id"]),
                "name": names_by_id.get(record["person_id"], "Unknown"),
                "month": record["month"],
                "year": record["year"],
                "expected": expected,
                "paid": paid,
                "balance": balance,
                "status": record.get("status") or compute_status(expected, paid),
                "payment_date": record.get("payment_date"),
            }
        )
    return rows


def summarize_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    total_people = len(rows)
    expected_amount = sum(r["expected"] for r in rows)
    collected_amount = sum(r["paid"] for r in rows)
    pending_amount = max(expected_amount - collected_amount, 0)
    collection_percentage = calculate_percentage(collected_amount, expected_amount)
    return {
        "total_people": total_people,
        "expected_amount": expected_amount,
        "collected_amount": collected_amount,
        "pending_amount": pending_amount,
        "collection_percentage": collection_percentage,
    }


async def get_dashboard_summary(db: AsyncIOMotorDatabase, month: int, year: int) -> dict[str, Any]:
    # Only two summary documents cross the network, regardless of collection size.
    # Record overrides retain the existing expected-amount and inactive-person rules.
    default_amount = {"$multiply": ["$default_monthly_amount", {"$ifNull": ["$count", 1]}]}
    people_pipeline = [{"$group": {
        "_id": None,
        "all_people": {"$sum": 1},
        "total_people": {"$sum": {"$cond": [{"$eq": ["$status", "active"]}, 1, 0]}},
        "expected": {"$sum": {"$toDecimal": {"$cond": [{"$eq": ["$status", "active"]}, default_amount, 0]}}},
    }}]
    records_pipeline = [
        {"$match": {"year": year, "month": month}},
        {"$lookup": {"from": "people", "localField": "person_id", "foreignField": "_id", "as": "person"}},
        {"$unwind": "$person"},
        {"$match": {"person.status": "active"}},
        {"$group": {
            "_id": None,
            "expected": {"$sum": {"$toDecimal": "$amount"}},
            "replaced_default": {"$sum": {"$toDecimal": {"$multiply": [
                "$person.default_monthly_amount", {"$ifNull": ["$person.count", 1]}
            ]}}},
            "collected": {"$sum": {"$ifNull": ["$paid_amount", 0]}},
        }},
    ]
    people, records = await asyncio.gather(
        db["people"].aggregate(people_pipeline).to_list(length=1),
        db["monthly_records"].aggregate(records_pipeline).to_list(length=1),
    )
    person_totals = people[0] if people else {}
    record_totals = records[0] if records else {}
    # Decimal subtotals avoid losing small record overrides when defaults are large.
    def subtotal(totals, key):
        value = totals.get(key, 0)
        return value.to_decimal() if isinstance(value, Decimal128) else Decimal(str(value))

    expected = float(
        subtotal(person_totals, "expected")
        - subtotal(record_totals, "replaced_default")
        + subtotal(record_totals, "expected")
    )
    collected = record_totals.get("collected", 0)
    return {
        "total_people": person_totals.get("total_people", 0),
        "expected_amount": expected,
        "collected_amount": collected,
        "pending_amount": max(expected - collected, 0),
        "collection_percentage": calculate_percentage(collected, expected),
        "has_any_people": person_totals.get("all_people", 0) > 0,
    }


async def get_person_history(db: AsyncIOMotorDatabase, person_id: str) -> list[dict[str, Any]]:
    records = (
        await db["monthly_records"]
        .find({"person_id": ObjectId(person_id)})
        .sort([("year", -1), ("month", -1)])
        .to_list(length=None)
    )
    return records


async def get_person_stats(db: AsyncIOMotorDatabase, person_id: str) -> dict[str, Any]:
    oid = ObjectId(person_id)
    stats = await get_people_stats(db, [oid])
    return stats.get(oid, empty_person_stats())


def empty_person_stats() -> dict[str, Any]:
    return {
        "total_contributed": 0, "paid_months": 0, "pending_months": 0,
        "last_payment_date": None, "current_month_status": "pending", "current_month_paid": 0,
    }


async def get_people_stats(
    db: AsyncIOMotorDatabase, person_ids: list[ObjectId],
    month: int | None = None, year: int | None = None,
) -> dict[ObjectId, dict[str, Any]]:
    if not person_ids:
        return {}
    current = {"$and": [{"$eq": ["$month", month]}, {"$eq": ["$year", year]}]}
    rows = await db["monthly_records"].aggregate([
        {"$match": {"person_id": person_ids[0] if len(person_ids) == 1 else {"$in": person_ids}}},
        {"$group": {
            "_id": "$person_id",
            "total_contributed": {"$sum": {"$ifNull": ["$paid_amount", 0]}},
            "paid_months": {"$sum": {"$cond": [{"$eq": ["$status", "paid"]}, 1, 0]}},
            "pending_months": {"$sum": {"$cond": [{"$in": ["$status", ["pending", "partial"]]}, 1, 0]}},
            "last_payment_date": {"$max": "$payment_date"},
            "current_month_status": {"$max": {"$cond": [current, "$status", None]}},
            "current_month_paid": {"$sum": {"$cond": [current, {"$ifNull": ["$paid_amount", 0]}, 0]}},
        }},
    ]).to_list(length=None)
    for row in rows:
        row["current_month_status"] = row.get("current_month_status") or "pending"
    return {row["_id"]: row for row in rows}
