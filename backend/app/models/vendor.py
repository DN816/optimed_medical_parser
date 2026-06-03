from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Integer, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class Vendor(Base):
    __tablename__ = "vendors"
    __table_args__ = (UniqueConstraint("org_id", "name", name="uix_org_vendor_name"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    gstin = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    drug_license = Column(String, nullable=True)

    trust_score = Column(Integer, default=50)  # 0-100
    total_bills = Column(Integer, default=0)
    auto_approved_bills = Column(Integer, default=0)

    status = Column(String, default="active")  # active, review, blocked
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_active = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization")
    bills = relationship("Bill", back_populates="vendor")
