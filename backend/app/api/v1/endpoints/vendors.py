import logging
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api import deps
from app.models.user import User
from app.models.vendor import Vendor
from app.models.bill import Bill

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
def list_vendors(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None, description="Filter by status: active, review, blocked"),
    search: Optional[str] = Query(None, description="Search by vendor name"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """List all vendors for the current organization."""
    query = db.query(Vendor).filter(Vendor.org_id == current_user.org_id)

    if status:
        query = query.filter(Vendor.status == status)
    if search:
        query = query.filter(Vendor.name.ilike(f"%{search}%"))

    query = query.order_by(Vendor.total_bills.desc())
    vendors = query.offset(skip).limit(limit).all()

    return [
        {
            "id": v.id,
            "org_id": v.org_id,
            "name": v.name,
            "gstin": v.gstin,
            "address": v.address,
            "phone": v.phone,
            "email": v.email,
            "drug_license": v.drug_license,
            "trust_score": v.trust_score,
            "total_bills": v.total_bills,
            "auto_approved_bills": v.auto_approved_bills,
            "status": v.status,
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "last_active": v.last_active.isoformat() if v.last_active else None,
        }
        for v in vendors
    ]


@router.get("/stats")
def vendor_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Get vendor summary stats."""
    total = db.query(func.count(Vendor.id)).filter(Vendor.org_id == current_user.org_id).scalar() or 0
    active = db.query(func.count(Vendor.id)).filter(Vendor.org_id == current_user.org_id, Vendor.status == "active").scalar() or 0
    avg_trust = db.query(func.avg(Vendor.trust_score)).filter(Vendor.org_id == current_user.org_id).scalar() or 0

    return {
        "total_vendors": total,
        "active_vendors": active,
        "average_trust_score": round(float(avg_trust), 1),
    }


@router.get("/{vendor_id}")
def get_vendor(
    vendor_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Get a single vendor with computed stats."""
    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.org_id == current_user.org_id
    ).first()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Compute bill-level stats from actual data
    bill_count = db.query(func.count(Bill.id)).filter(Bill.vendor_id == vendor_id).scalar() or 0
    avg_confidence = db.query(func.avg(Bill.confidence_score)).filter(Bill.vendor_id == vendor_id).scalar() or 0
    completed = db.query(func.count(Bill.id)).filter(Bill.vendor_id == vendor_id, Bill.status == "completed").scalar() or 0
    needs_review = db.query(func.count(Bill.id)).filter(Bill.vendor_id == vendor_id, Bill.status == "needs_review").scalar() or 0

    return {
        "id": vendor.id,
        "org_id": vendor.org_id,
        "name": vendor.name,
        "gstin": vendor.gstin,
        "address": vendor.address,
        "phone": vendor.phone,
        "email": vendor.email,
        "drug_license": vendor.drug_license,
        "trust_score": vendor.trust_score,
        "total_bills": vendor.total_bills,
        "auto_approved_bills": vendor.auto_approved_bills,
        "status": vendor.status,
        "created_at": vendor.created_at.isoformat() if vendor.created_at else None,
        "last_active": vendor.last_active.isoformat() if vendor.last_active else None,
        "stats": {
            "bill_count": bill_count,
            "avg_confidence": round(float(avg_confidence) * 100, 1),
            "completed": completed,
            "needs_review": needs_review,
        }
    }


@router.get("/{vendor_id}/bills")
def get_vendor_bills(
    vendor_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Get all bills for a specific vendor."""
    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.org_id == current_user.org_id
    ).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    bills = db.query(Bill).filter(
        Bill.vendor_id == vendor_id,
        Bill.org_id == current_user.org_id
    ).order_by(Bill.created_at.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": b.id,
            "file_name": b.file_name,
            "file_type": b.file_type,
            "file_url": b.file_url,
            "status": b.status,
            "confidence_score": b.confidence_score,
            "ocr_engine": b.ocr_engine,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "extracted_data": b.extracted_data,
            "validation_results": b.validation_results,
        }
        for b in bills
    ]


@router.put("/{vendor_id}")
def update_vendor(
    vendor_id: str,
    updates: dict,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_admin)
) -> Any:
    """Update vendor status or info."""
    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.org_id == current_user.org_id
    ).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    allowed_fields = ["status", "name", "gstin", "address", "phone", "email", "drug_license"]
    for field in allowed_fields:
        if field in updates:
            setattr(vendor, field, updates[field])

    db.commit()
    db.refresh(vendor)

    return {"message": "Vendor updated", "id": vendor.id}
