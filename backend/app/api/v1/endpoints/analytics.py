import logging
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Float, extract
from datetime import datetime, timezone, timedelta

from app.api import deps
from app.models.user import User
from app.models.bill import Bill
from app.models.vendor import Vendor
from app.models.bill_item import BillItem

logger = logging.getLogger(__name__)

router = APIRouter()


def _date_cutoff(range_str: str) -> Optional[datetime]:
    """Convert a range string to a cutoff datetime."""
    now = datetime.now(timezone.utc)
    if range_str == "30d":
        return now - timedelta(days=30)
    elif range_str == "90d":
        return now - timedelta(days=90)
    elif range_str == "1y":
        return now - timedelta(days=365)
    return None  # 'all'


@router.get("/summary")
def analytics_summary(
    range: str = Query("all", description="Date range: 30d, 90d, 1y, all"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Comprehensive analytics summary — all metrics computed from real DB data.
    """
    cutoff = _date_cutoff(range)
    base_query = db.query(Bill).filter(Bill.org_id == current_user.org_id)
    if cutoff:
        base_query = base_query.filter(Bill.created_at >= cutoff)

    total_bills = base_query.count()
    completed = base_query.filter(Bill.status == "completed").count()
    needs_review = base_query.filter(Bill.status == "needs_review").count()
    failed = base_query.filter(Bill.status == "failed").count()
    avg_confidence = db.query(func.avg(Bill.confidence_score)).filter(
        Bill.org_id == current_user.org_id,
        Bill.status.in_(["completed", "needs_review"])
    ).scalar() or 0.0

    # Spend — extract grand_total from JSON
    all_bills_data = base_query.filter(Bill.status == "completed").with_entities(Bill.extracted_data).order_by(Bill.created_at.desc()).limit(1000).all()
    total_spend = 0.0
    total_tax = 0.0
    for (ext_data,) in all_bills_data:
        if ext_data and ext_data.get("totals"):
            total_spend += float(ext_data["totals"].get("grand_total") or 0)
            total_tax += float(ext_data["totals"].get("total_cgst") or 0)
            total_tax += float(ext_data["totals"].get("total_sgst") or 0)

    avg_bill_value = total_spend / len(all_bills_data) if all_bills_data else 0

    # Auto-approval rate
    auto_approved = 0
    conf_scores = base_query.filter(Bill.status == "completed").with_entities(Bill.confidence_score).order_by(Bill.created_at.desc()).limit(1000).all()
    for (score,) in conf_scores:
        if score and score > 0.8:
            auto_approved += 1

    auto_approval_rate = round((auto_approved / total_bills * 100) if total_bills > 0 else 0, 1)

    # Vendor count
    vendor_count = db.query(func.count(Vendor.id)).filter(
        Vendor.org_id == current_user.org_id
    ).scalar() or 0

    return {
        "total_bills": total_bills,
        "completed": completed,
        "needs_review": needs_review,
        "failed": failed,
        "average_confidence": round(float(avg_confidence) * 100, 1),
        "total_spend": round(total_spend, 2),
        "total_tax": round(total_tax, 2),
        "avg_bill_value": round(avg_bill_value, 2),
        "auto_approval_rate": auto_approval_rate,
        "vendor_count": vendor_count,
    }


@router.get("/spend")
def analytics_spend(
    range: str = Query("all", description="Date range: 30d, 90d, 1y, all"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Monthly spend trend from real bill data."""
    cutoff = _date_cutoff(range)
    query = db.query(Bill).filter(
        Bill.org_id == current_user.org_id,
        Bill.status == "completed"
    )
    if cutoff:
        query = query.filter(Bill.created_at >= cutoff)

    bills_data = query.with_entities(Bill.created_at, Bill.extracted_data).order_by(Bill.created_at.asc()).limit(1000).all()

    monthly: dict = {}
    for created_at, ext_data in bills_data:
        if created_at and ext_data:
            key = created_at.strftime("%b '%y")
            amount = float(ext_data.get("totals", {}).get("grand_total") or 0)
            monthly[key] = monthly.get(key, 0) + amount

    chart_data = [{"label": k, "value": round(v, 2)} for k, v in monthly.items()]

    return {"chart_data": chart_data}


@router.get("/ops")
def analytics_ops(
    range: str = Query("all", description="Date range: 30d, 90d, 1y, all"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Operational metrics — accuracy, volume trends."""
    cutoff = _date_cutoff(range)
    query = db.query(Bill).filter(Bill.org_id == current_user.org_id)
    if cutoff:
        query = query.filter(Bill.created_at >= cutoff)

    bills_data = query.with_entities(Bill.confidence_score, Bill.status, Bill.created_at).order_by(Bill.created_at.desc()).limit(1000).all()
    total = len(bills_data)

    if total == 0:
        return {
            "accuracy": 0,
            "auto_approval_rate": 0,
            "total_processed": 0,
            "chart_data": []
        }

    total_confidence = sum(score or 0 for score, _, _ in bills_data)
    auto_approved = sum(
        1 for score, status, _ in bills_data
        if status == "completed" and (score or 0) > 0.8
    )

    # Daily volume (last 14 days)
    daily: dict = {}
    for _, _, created_at in bills_data:
        if created_at:
            key = created_at.strftime("%d %b")
            daily[key] = daily.get(key, 0) + 1

    # Take last 14 entries
    chart_items = list(daily.items())[-14:]
    chart_data = [{"label": k, "value": v} for k, v in chart_items]

    return {
        "accuracy": round((total_confidence / total) * 100, 1) if total > 0 else 0,
        "auto_approval_rate": round((auto_approved / total) * 100, 1) if total > 0 else 0,
        "total_processed": total,
        "chart_data": chart_data
    }


@router.get("/vendors")
def analytics_vendors(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Vendor performance metrics computed from real data."""
    vendors = db.query(Vendor).filter(
        Vendor.org_id == current_user.org_id
    ).order_by(Vendor.total_bills.desc()).limit(20).all()

    result = []
    for v in vendors:
        avg_conf = db.query(func.avg(Bill.confidence_score)).filter(
            Bill.vendor_id == v.id
        ).scalar() or 0

        result.append({
            "vendor_name": v.name,
            "total_bills": v.total_bills,
            "trust_score": v.trust_score,
            "avg_confidence": round(float(avg_conf) * 100, 1),
            "auto_approved_bills": v.auto_approved_bills,
            "corrected_bills": v.total_bills - v.auto_approved_bills,
        })

    return result


@router.get("/recent-bills")
def recent_bills(
    limit: int = Query(5, le=20),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Get the most recently processed bills for the dashboard."""
    bills = db.query(Bill).filter(
        Bill.org_id == current_user.org_id
    ).order_by(Bill.created_at.desc()).limit(limit).all()

    return [
        {
            "id": b.id,
            "file_name": b.file_name,
            "status": b.status,
            "confidence_score": b.confidence_score,
            "ocr_engine": b.ocr_engine,
            "vendor_name": (b.extracted_data or {}).get("seller_info", {}).get("supplier_name"),
            "grand_total": (b.extracted_data or {}).get("totals", {}).get("grand_total"),
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in bills
    ]
