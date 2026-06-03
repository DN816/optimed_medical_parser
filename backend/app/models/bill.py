from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class Bill(Base):
    __tablename__ = "bills"
    __table_args__ = (Index('ix_bills_vendor_org', 'vendor_id', 'org_id'),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey("organizations.id"), index=True)
    vendor_id = Column(String, ForeignKey("vendors.id"), nullable=True, index=True)
    batch_id = Column(String, nullable=True, index=True)
    file_name = Column(String)
    file_type = Column(String)
    file_url = Column(String)
    status = Column(String, default="processing", index=True)  # queued, processing, completed, needs_review, failed
    confidence_score = Column(Float, default=0.0)
    ocr_engine = Column(String, nullable=True)  # tesseract, gemini, tesseract_fallback

    # Store the full JSON blob of extracted data
    extracted_data = Column(JSON, nullable=True)

    # Store validation results
    validation_results = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization")
    vendor = relationship("Vendor", back_populates="bills")
    items = relationship("BillItem", back_populates="bill", cascade="all, delete-orphan")
