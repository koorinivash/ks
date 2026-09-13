from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.database.mongodb import get_database
from app.models.monthly_record import compute_status, new_monthly_record_document, record_doc_to_response
from app.schemas.monthly_record import MonthlyRecordCreate, MonthlyRecordResponse, MonthlyRecordUpdate
from app.utils.object_id import is_valid_object_id

router = APIRouter(prefix="/api/monthly-records", tags=["monthly-records"])


def _validate_object_id(record_id: str, label: str = "record") -> ObjectId:
    if not is_valid_object_id(record_id):
        raise HTTPException(status_code=400, detail=f"Invalid {label} id")
    return ObjectId(record_id)


async def _attach_person_name(db: AsyncIOMotorDatabase, doc: dict) -> dict:
    person = await db["people"].find_one({"_id": doc["person_id"]}, {"name": 1})
    return record_doc_to_response(doc, person_name=person["name"] if person else None)


@router.post("", response_model=MonthlyRecordResponse, status_code=201)
async def create_monthly_record(payload: MonthlyRecordCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    person_oid = _validate_object_id(payload.person_id, "person")
    person = await db["people"].find_one({"_id": person_oid})
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    status = payload.status or compute_status(payload.amount, payload.paid_amount)
    doc = new_monthly_record_document(
        person_id=person_oid,
        month=payload.month,
        year=payload.year,
        amount=payload.amount,
        paid_amount=payload.paid_amount,
        status=status,
        payment_date=payload.payment_date,
        notes=payload.notes,
    )
    try:
        result = await db["monthly_records"].insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=400,
            detail="A monthly record already exists for this person, month, and year",
        )
    doc["_id"] = result.inserted_id
    return await _attach_person_name(db, doc)


@router.get("", response_model=list[MonthlyRecordResponse])
async def list_monthly_records(
    person_id: str | None = Query(default=None),
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    status: str | None = Query(default=None),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    query: dict = {}
    if person_id:
        query["person_id"] = _validate_object_id(person_id, "person")
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    if status:
        query["status"] = status

    records = (
        await db["monthly_records"].find(query).sort([("year", -1), ("month", -1)]).to_list(length=None)
    )
    people_ids = {r["person_id"] for r in records}
    people = await db["people"].find({"_id": {"$in": list(people_ids)}}, {"name": 1}).to_list(length=None)
    names_by_id = {p["_id"]: p["name"] for p in people}

    return [record_doc_to_response(r, names_by_id.get(r["person_id"])) for r in records]


@router.get("/{record_id}", response_model=MonthlyRecordResponse)
async def get_monthly_record(record_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    oid = _validate_object_id(record_id)
    record = await db["monthly_records"].find_one({"_id": oid})
    if not record:
        raise HTTPException(status_code=404, detail="Monthly record not found")
    return await _attach_person_name(db, record)


@router.put("/{record_id}", response_model=MonthlyRecordResponse)
async def update_monthly_record(
    record_id: str, payload: MonthlyRecordUpdate, db: AsyncIOMotorDatabase = Depends(get_database)
):
    oid = _validate_object_id(record_id)
    existing = await db["monthly_records"].find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Monthly record not found")

    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    amount = updates.get("amount", existing["amount"])
    paid_amount = updates.get("paid_amount", existing.get("paid_amount", 0))
    if "status" not in updates:
        updates["status"] = compute_status(amount, paid_amount)

    updates["updated_at"] = datetime.now(timezone.utc)
    await db["monthly_records"].update_one({"_id": oid}, {"$set": updates})
    updated = await db["monthly_records"].find_one({"_id": oid})
    return await _attach_person_name(db, updated)


@router.delete("/{record_id}", status_code=204)
async def delete_monthly_record(record_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
    oid = _validate_object_id(record_id)
    result = await db["monthly_records"].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Monthly record not found")
    return None
