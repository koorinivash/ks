from typing import Any

from bson import ObjectId
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
    people = await db["people"].find({"status": "active"}).sort("name", 1).to_list(length=None)
    records = await db["monthly_records"].find({"month": month, "year": year}).to_list(length=None)
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
        .find({})
        .sort([("year", -1), ("month", -1)])
        .to_list(length=None)
    )
    person_ids = {r["person_id"] for r in records}
    people = await db["people"].find({"_id": {"$in": list(person_ids)}}).to_list(length=None)
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
    rows = await get_monthly_report_rows(db, month, year)
    return summarize_rows(rows)


async def get_person_history(db: AsyncIOMotorDatabase, person_id: str) -> list[dict[str, Any]]:
    records = (
        await db["monthly_records"]
        .find({"person_id": ObjectId(person_id)})
        .sort([("year", -1), ("month", -1)])
        .to_list(length=None)
    )
    return records


async def get_person_stats(db: AsyncIOMotorDatabase, person_id: str) -> dict[str, Any]:
    records = await get_person_history(db, person_id)
    total_contributed = sum(r.get("paid_amount", 0) for r in records)
    paid_months = sum(1 for r in records if r.get("status") == "paid")
    pending_months = sum(1 for r in records if r.get("status") in ("pending", "partial"))
    last_payment = next(
        (r.get("payment_date") for r in records if r.get("payment_date")), None
    )
    return {
        "total_contributed": total_contributed,
        "paid_months": paid_months,
        "pending_months": pending_months,
        "last_payment_date": last_payment,
    }
