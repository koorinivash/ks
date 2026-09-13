from datetime import datetime, timezone
from typing import Any


def compute_status(amount: float, paid_amount: float) -> str:
    if paid_amount <= 0:
        return "pending"
    if paid_amount >= amount:
        return "paid"
    return "partial"


def new_monthly_record_document(
    person_id: Any,
    month: int,
    year: int,
    amount: float,
    paid_amount: float,
    status: str,
    payment_date: datetime | None,
    notes: str | None,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "person_id": person_id,
        "month": month,
        "year": year,
        "amount": amount,
        "paid_amount": paid_amount,
        "status": status,
        "payment_date": payment_date,
        "notes": notes,
        "created_at": now,
        "updated_at": now,
    }


def record_doc_to_response(doc: dict[str, Any], person_name: str | None = None) -> dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "person_id": str(doc["person_id"]),
        "person_name": person_name,
        "month": doc["month"],
        "year": doc["year"],
        "amount": doc["amount"],
        "paid_amount": doc.get("paid_amount", 0),
        "status": doc.get("status", "pending"),
        "payment_date": doc.get("payment_date"),
        "notes": doc.get("notes"),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }
