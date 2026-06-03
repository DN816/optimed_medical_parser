from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User
from pydantic import BaseModel, EmailStr
from app.api.v1.endpoints.audit_logs import create_audit_log_internal
from app.core.security import get_password_hash

router = APIRouter()
@router.get("/", response_model=List[dict])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """List all users in the current organization."""
    users = db.query(User).filter(User.org_id == current_user.org_id).offset(skip).limit(limit).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "org_id": u.org_id,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]

class UserInviteReq(BaseModel):
    email: EmailStr
    role: str = "viewer"

class UserRoleReq(BaseModel):
    role: str

@router.post("/invite")
def invite_user(
    req: UserInviteReq,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_admin)
) -> Any:
    if current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to invite users")
        
    user = db.query(User).filter(User.email == req.email).first()
    if user:
        raise HTTPException(status_code=400, detail="User already exists")

    # In a real app, generate a random password and send an invite email
    import secrets
    random_password = secrets.token_urlsafe(12)
    new_user = User(
        email=req.email,
        hashed_password=get_password_hash(random_password),
        org_id=current_user.org_id,
        role=req.role,
        full_name=req.email.split("@")[0]
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    create_audit_log_internal(
        db=db,
        org_id=current_user.org_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="INVITE_USER",
        entity_type="USER",
        entity_id=new_user.id,
        metadata={"invited_email": req.email, "role": req.role}
    )
    db.commit()

    return {"message": "User invited successfully", "id": new_user.id}

@router.put("/{user_id}/role")
def update_user_role(
    user_id: str,
    req: UserRoleReq,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_admin)
) -> Any:
    """Update a user's role."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update roles")

    user = db.query(User).filter(User.id == user_id, User.org_id == current_user.org_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    user.role = req.role
    
    create_audit_log_internal(
        db=db,
        org_id=current_user.org_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="UPDATE_USER_ROLE",
        entity_type="USER",
        entity_id=user.id,
        metadata={"old_role": old_role, "new_role": req.role}
    )
    db.commit()
    return {"message": "Role updated successfully"}

@router.put("/{user_id}/deactivate")
def deactivate_user(
    user_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_admin)
) -> Any:
    """Toggle a user's active status."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to deactivate users")

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    user = db.query(User).filter(User.id == user_id, User.org_id == current_user.org_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    
    create_audit_log_internal(
        db=db,
        org_id=current_user.org_id,
        user_id=current_user.id,
        user_email=current_user.email,
        action="TOGGLE_USER_STATUS",
        entity_type="USER",
        entity_id=user.id,
        metadata={"is_active": user.is_active}
    )
    db.commit()
    return {"message": f"User {'activated' if user.is_active else 'deactivated'} successfully"}
