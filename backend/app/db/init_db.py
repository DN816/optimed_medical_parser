import os
import logging
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.user import User
from app.models.organization import Organization
from app.models.vendor import Vendor
from app.models.bill import Bill
from app.models.bill_item import BillItem
from app.models.audit_log import AuditLog
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)


def init_db(db: Session):
    """
    Initialize database tables and create a minimal seed admin user.
    No fake/mock data — only a single org + admin for first login.
    """
    # Create all tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified.")

    # Only seed if no organization exists at all
    org_count = db.query(Organization).count()
    if org_count > 0:
        logger.info("Database already has data — skipping seed.")
        return

    # Create a default organization
    org = Organization(
        name="Default Organization",
        subscription_plan="enterprise",
        status="active"
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    # Create admin user
    import secrets
    seed_password = os.environ.get("SEED_PASSWORD")
    if not seed_password:
        seed_password = secrets.token_urlsafe(12)
        logger.warning(f"No SEED_PASSWORD provided. Generated random password: {seed_password}")

    admin = User(
        email="admin@optimed.com",
        hashed_password=get_password_hash(seed_password),
        full_name="Admin User",
        org_id=org.id,
        role="admin",
        is_active=True,
        is_superuser=True
    )
    db.add(admin)
    db.commit()

    print(f"Database initialized with seed admin: admin@optimed.com")
    print(f"Password: {seed_password}")
    print(f"Organization: {org.name} (id: {org.id})")


if __name__ == "__main__":
    db = SessionLocal()
    init_db(db)
