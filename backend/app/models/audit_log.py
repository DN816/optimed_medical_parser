from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
import uuid
from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String, nullable=False)
    action = Column(String, nullable=False, index=True)  # UPLOAD_BILL, UPDATE_BILL, DELETE_BILL, LOGIN, etc.
    entity_type = Column(String, nullable=False)  # BILL, VENDOR, USER, AUTH, EXPORT, etc.
    entity_id = Column(String, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    action_metadata = Column(JSON, nullable=True)  # renamed from metadata to avoid SQLAlchemy reserved attribute conflict
