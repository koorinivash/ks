from datetime import datetime, timezone
from typing import Any


def new_person_document(
    name: str, phone: str | None, default_monthly_amount: float, count: int, status: str
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "name": name,
        "phone": phone,
        "default_monthly_amount": default_monthly_amount,
        "count": count,
        "status": status,
        "created_at": now,
        "updated_at": now,
    }


def get_total_monthly_amount(doc: dict[str, Any]) -> float:
    return doc["default_monthly_amount"] * doc.get("count", 1)


def person_doc_to_response(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "phone": doc.get("phone"),
        "default_monthly_amount": doc["default_monthly_amount"],
        "count": doc.get("count", 1),
        "total_monthly_amount": get_total_monthly_amount(doc),
        "status": doc.get("status", "active"),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }
