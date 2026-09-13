from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import get_database
from app.models.person import new_person_document, person_doc_to_response
from app.schemas.person import PersonCreate, PersonResponse, PersonUpdate, PersonWithStats
from app.services import finance_service
from app.utils.object_id import is_valid_object_id

router = APIRouter(prefix="/api/people", tags=["people"])


def _validate_object_id(person_id: str) -> ObjectId:
    if not is_valid_object_id(person_id):
        raise HTTPException(status_code=400, detail="Invalid person id")
    return ObjectId(person_id)


@router.post("", response_model=PersonResponse, status_code=201)
async def create_person(payload: PersonCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    existing = await db["people"].find_one({"name": payload.name, "status": "active"})
    if existing:
        raise HTTPException(status_code=400, detail="A person with this name already exists")

    doc = new_person_document(
        payload.name, payload.phone, payload.default_monthly_amount, payload.count, payload.status
    )
    result = await db["people"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return person_doc_to_response(doc)


@router.get("", response_model=list[PersonWithStats])
async def list_people(
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    query: dict = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
        ]

    people = await db["people"].find(query).sort("name", 1).to_list(length=None)

    now = datetime.now(timezone.utc)
    target_month = month or now.month
    target_year = year or now.year

    results = []
    for person in people:
        base = person_doc_to_response(person)
        stats = await finance_service.get_person_stats(db, str(person["_id"]))
        current_record = await db["monthly_records"].find_one(
            {"person_id": person["_id"], "month": target_month, "year": target_year}
        )
        results.append(
            PersonWithStats(
                **base,
                total_contributed=stats["total_contributed"],
                paid_months=stats["paid_months"],
                pending_months=stats["pending_months"],
                last_payment_date=stats["last_payment_date"],
                current_month_status=current_record.get("status") if current_record else "pending",
                current_month_paid=current_record.get("paid_amount", 0) if current_record else 0,
            )
        )
    return results


@router.get("/{person_id}", response_model=PersonWithStats)
async def get_person(person_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    oid = _validate_object_id(person_id)
    person = await db["people"].find_one({"_id": oid})
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    base = person_doc_to_response(person)
    stats = await finance_service.get_person_stats(db, person_id)
    return PersonWithStats(
        **base,
        total_contributed=stats["total_contributed"],
        paid_months=stats["paid_months"],
        pending_months=stats["pending_months"],
        last_payment_date=stats["last_payment_date"],
    )


@router.put("/{person_id}", response_model=PersonResponse)
async def update_person(person_id: str, payload: PersonUpdate, db: AsyncIOMotorDatabase = Depends(get_database)):
    oid = _validate_object_id(person_id)
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db["people"].update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Person not found")
    updated = await db["people"].find_one({"_id": oid})
    return person_doc_to_response(updated)


@router.delete("/{person_id}", status_code=204)
async def delete_person(person_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    oid = _validate_object_id(person_id)
    result = await db["people"].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Person not found")
    await db["monthly_records"].delete_many({"person_id": oid})
    return None
