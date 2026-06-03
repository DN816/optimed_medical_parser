import logging
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
def list_audit_logs(
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = Query(None, description="Filter by action type"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """List audit logs for the organization."""
    query = db.query(AuditLog).filter(AuditLog.org_id == current_user.org_id)

    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    logs = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": log.id,
            "org_id": log.org_id,
            "user_id": log.user_id,
            "user_email": log.user_email,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "metadata": log.action_metadata,
        }
        for log in logs
    ]


@router.post("/")
def create_audit_log(
    log_data: dict,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Create an audit log entry."""
    log = AuditLog(
        org_id=current_user.org_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action=log_data.get("action", "UNKNOWN"),
        entity_type=log_data.get("entity_type", "UNKNOWN"),
        entity_id=log_data.get("entity_id", ""),
        action_metadata=log_data.get("metadata"),
    )
    db.add(log)
    db.commit()

    return {"message": "Audit log created", "id": log.id}


def create_audit_log_internal(
    db: Session,
    org_id: str,
    user_id: str,
    user_email: str,
    action: str,
    entity_type: str,
    entity_id: str,
    metadata: dict = None
):
    """
    Internal helper to create audit logs from other endpoints.
    Does NOT commit — the caller is responsible for committing.
    """
    log = AuditLog(
        org_id=org_id,
        user_id=user_id,
        user_email=user_email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        action_metadata=metadata,
    )
    db.add(log)
    return log
