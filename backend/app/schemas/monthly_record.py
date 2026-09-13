from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

RecordStatus = Literal["paid", "pending", "partial"]


class MonthlyRecordCreate(BaseModel):
    person_id: str
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    amount: float = Field(..., ge=0, description="Expected amount for the month")
    paid_amount: float = Field(default=0, ge=0)
    status: Optional[RecordStatus] = None
    payment_date: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, max_length=500)


class MonthlyRecordUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, ge=0)
    paid_amount: Optional[float] = Field(default=None, ge=0)
    status: Optional[RecordStatus] = None
    payment_date: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, max_length=500)


class MonthlyRecordResponse(BaseModel):
    id: str
    person_id: str
    person_name: Optional[str] = None
    month: int
    year: int
    amount: float
    paid_amount: float
    status: RecordStatus
    payment_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
