from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

PersonStatus = Literal["active", "inactive"]


class PersonCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    default_monthly_amount: float = Field(default=0, ge=0)
    count: int = Field(default=1, ge=1, description="Number of shares/units this person holds")
    status: PersonStatus = "active"

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Name must not be blank")
        return stripped


class PersonUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    default_monthly_amount: Optional[float] = Field(default=None, ge=0)
    count: Optional[int] = Field(default=None, ge=1)
    status: Optional[PersonStatus] = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("Name must not be blank")
        return stripped


class PersonResponse(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    default_monthly_amount: float
    count: int = 1
    total_monthly_amount: float
    status: PersonStatus
    created_at: datetime
    updated_at: datetime


class PersonWithStats(PersonResponse):
    total_contributed: float = 0
    paid_months: int = 0
    pending_months: int = 0
    current_month_status: Optional[str] = None
    current_month_paid: float = 0
    last_payment_date: Optional[datetime] = None
