from typing import Optional, Any, Dict
from pydantic import BaseModel
from datetime import datetime

class BillBase(BaseModel):
    file_name: str
    file_type: str

class BillCreate(BillBase):
    pass

class BillUpdate(BaseModel):
    status: Optional[str] = None
    confidence_score: Optional[float] = None
    extracted_data: Optional[Dict[str, Any]] = None
    validation_results: Optional[Dict[str, Any]] = None

class BillInDBBase(BillBase):
    id: str
    org_id: str
    vendor_id: Optional[str] = None
    batch_id: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    file_url: Optional[str] = None
    confidence_score: float = 0.0
    ocr_engine: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    validation_results: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class Bill(BillInDBBase):
    pass
