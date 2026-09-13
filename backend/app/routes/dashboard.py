from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import get_database
from app.services import finance_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
async def get_dashboard(
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    now = datetime.now(timezone.utc)
    target_month = month or now.month
    target_year = year or now.year
    summary = await finance_service.get_dashboard_summary(db, target_month, target_year)
    return {**summary, "month": target_month, "year": target_year}
