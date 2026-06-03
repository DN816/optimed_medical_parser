from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from app.db.base import Base


class BillItem(Base):
    __tablename__ = "bill_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    bill_id = Column(String, ForeignKey("bills.id", ondelete="CASCADE"), nullable=False, index=True)

    sr_no = Column(Integer, nullable=True)
    hsn_code = Column(String, nullable=True)
    product_name = Column(String, nullable=True)
    manufacturer = Column(String, nullable=True)
    batch_no = Column(String, nullable=True)
    expiry_date = Column(String, nullable=True)
    quantity = Column(Float, nullable=True)
    pack_size = Column(String, nullable=True)
    free = Column(Float, nullable=True)
    mrp = Column(Float, nullable=True)
    rate = Column(Float, nullable=True)
    gross_value = Column(Float, nullable=True)
    discount_percentage = Column(Float, nullable=True)
    discount_amount = Column(Float, nullable=True)
    taxable_amount = Column(Float, nullable=True)
    cgst_percentage = Column(Float, nullable=True)
    cgst_amount = Column(Float, nullable=True)
    sgst_percentage = Column(Float, nullable=True)
    sgst_amount = Column(Float, nullable=True)
    total = Column(Float, nullable=True)

    bill = relationship("Bill", back_populates="items")
