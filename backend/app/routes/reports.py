from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database.mongodb import get_database
from app.services import finance_service, report_service

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _resolve_month_year(month: int | None, year: int | None) -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    return (month or now.month, year or now.year)


@router.get("/monthly")
async def get_monthly_report(
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    target_month, target_year = _resolve_month_year(month, year)
    rows = await finance_service.get_monthly_report_rows(db, target_month, target_year)
    summary = finance_service.summarize_rows(rows)
    return {"month": target_month, "year": target_year, "summary": summary, "rows": rows}


@router.get("/monthly/excel")
async def export_monthly_excel(
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    target_month, target_year = _resolve_month_year(month, year)
    rows = await finance_service.get_monthly_report_rows(db, target_month, target_year)
    summary = finance_service.summarize_rows(rows)
    content = report_service.generate_excel_report(rows, summary, target_month, target_year)
    filename = f"KS_Report_{target_year}_{target_month:02d}.xlsx"
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/monthly/pdf")
async def export_monthly_pdf(
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    target_month, target_year = _resolve_month_year(month, year)
    rows = await finance_service.get_monthly_report_rows(db, target_month, target_year)
    summary = finance_service.summarize_rows(rows)
    content = report_service.generate_pdf_report(rows, summary, target_month, target_year)
    filename = f"KS_Report_{target_year}_{target_month:02d}.pdf"
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/full")
async def get_full_report(db: AsyncIOMotorDatabase = Depends(get_database)):
    rows = await finance_service.get_full_report_rows(db)
    summary = finance_service.summarize_rows(rows)
    return {"summary": summary, "rows": rows}


@router.get("/full/excel")
async def export_full_excel(db: AsyncIOMotorDatabase = Depends(get_database)):
    rows = await finance_service.get_full_report_rows(db)
    summary = finance_service.summarize_rows(rows)
    content = report_service.generate_excel_report(rows, summary, None, None)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="KS_Full_Report.xlsx"'},
    )


@router.get("/full/pdf")
async def export_full_pdf(db: AsyncIOMotorDatabase = Depends(get_database)):
    rows = await finance_service.get_full_report_rows(db)
    summary = finance_service.summarize_rows(rows)
    content = report_service.generate_pdf_report(rows, summary, None, None)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="KS_Full_Report.pdf"'},
    )
