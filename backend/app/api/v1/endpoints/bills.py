import os
import logging
from typing import Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status, Request, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
import aiofiles
import uuid

from app.api import deps
from app.models.user import User
from app.models.bill import Bill
from app.models.bill_item import BillItem
from app.models.vendor import Vendor
from app.models.audit_log import AuditLog
from app.schemas.bill import Bill as BillSchema, BillUpdate
from app.services.hybrid_ocr_service import run_hybrid_ocr

logger = logging.getLogger(__name__)

router = APIRouter()


def _create_audit(db: Session, user: User, action: str, entity_type: str, entity_id: str, metadata: dict = None):
    """Create an audit log entry."""
    log = AuditLog(
        org_id=user.org_id,
        user_id=user.id,
        user_email=user.email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        action_metadata=metadata,
    )
    db.add(log)


def _find_or_create_vendor(db: Session, org_id: str, extracted_data: dict) -> Optional[str]:
    """
    Find or create a vendor from extracted seller_info.
    Returns the vendor ID, or None if no supplier_name found.
    """
    seller_info = extracted_data.get("seller_info", {})
    supplier_name = seller_info.get("supplier_name")
    if not supplier_name or not supplier_name.strip():
        return None

    supplier_name = supplier_name.strip()

    # Try to find existing vendor (case-insensitive)
    vendor = db.query(Vendor).filter(
        Vendor.org_id == org_id,
        func.lower(Vendor.name) == supplier_name.lower()
    ).first()

    if vendor:
        # Update existing vendor
        vendor.total_bills += 1
        vendor.last_active = datetime.now(timezone.utc)
        # Update details if they were previously null
        if not vendor.gstin and seller_info.get("gst_number"):
            vendor.gstin = seller_info["gst_number"]
        if not vendor.address and seller_info.get("supplier_address"):
            vendor.address = seller_info["supplier_address"]
        if not vendor.phone and seller_info.get("supplier_phone"):
            vendor.phone = seller_info["supplier_phone"]
        if not vendor.email and seller_info.get("supplier_email"):
            vendor.email = seller_info["supplier_email"]
        if not vendor.drug_license and seller_info.get("druglicense_number"):
            vendor.drug_license = seller_info["druglicense_number"]
    else:
        # Create new vendor
        vendor = Vendor(
            org_id=org_id,
            name=supplier_name,
            gstin=seller_info.get("gst_number"),
            address=seller_info.get("supplier_address"),
            phone=seller_info.get("supplier_phone"),
            email=seller_info.get("supplier_email"),
            drug_license=seller_info.get("druglicense_number"),
            trust_score=50,
            total_bills=1,
            auto_approved_bills=0,
            status="active",
        )
        db.add(vendor)
        db.flush()  # Get ID without committing

    return vendor.id


def _store_bill_items(db: Session, bill_id: str, extracted_data: dict):
    """Store individual line items from extracted invoice_items."""
    items = extracted_data.get("invoice_items", [])
    for item_data in items:
        bill_item = BillItem(
            bill_id=bill_id,
            sr_no=item_data.get("sr_no"),
            hsn_code=item_data.get("hsn_code"),
            product_name=item_data.get("product_name"),
            manufacturer=item_data.get("manufacturer"),
            batch_no=item_data.get("batch_no"),
            expiry_date=item_data.get("expiry_date"),
            quantity=_safe_float(item_data.get("quantity")),
            pack_size=item_data.get("pack_size"),
            free=_safe_float(item_data.get("free")),
            mrp=_safe_float(item_data.get("mrp")),
            rate=_safe_float(item_data.get("rate")),
            gross_value=_safe_float(item_data.get("gross_value")),
            discount_percentage=_safe_float(item_data.get("discount_percentage")),
            discount_amount=_safe_float(item_data.get("discount_amount")),
            taxable_amount=_safe_float(item_data.get("taxable_amount")),
            cgst_percentage=_safe_float(item_data.get("cgst_percentage")),
            cgst_amount=_safe_float(item_data.get("cgst_amount")),
            sgst_percentage=_safe_float(item_data.get("sgst_percentage")),
            sgst_amount=_safe_float(item_data.get("sgst_amount")),
            total=_safe_float(item_data.get("total")),
        )
        db.add(bill_item)


def _safe_float(val) -> Optional[float]:
    """Safely convert a value to float."""
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


@router.post("/upload", response_model=BillSchema)
async def upload_bill(
    request: Request,
    file: UploadFile = File(...),
    batch_id: Optional[str] = Form(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_admin)
) -> Any:
    """
    Upload a medical bill and process it with Hybrid OCR.
    - Runs Tesseract first, falls back to Gemini if confidence is low
    - Auto-creates/updates vendor from seller_info
    - Stores line items in bill_items table
    - Creates audit log entry
    """
    # 1. Validate File Type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type: {file.content_type}. Allowed: {', '.join(allowed_types)}")

    # 2. Read File & Validate Size
    from app.core.config import settings as app_settings
    contents = await file.read()
    max_size = app_settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {app_settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # 3. Save File to Supabase (with Local Fallback)
    bill_id = str(uuid.uuid4())
    ext = file.filename.split('.')[-1] if '.' in file.filename else "jpg"
    filename = f"{bill_id}.{ext}"
    
    file_url = None
    
    if app_settings.SUPABASE_URL and app_settings.SUPABASE_KEY:
        try:
            from supabase import create_client, Client
            supabase: Client = create_client(app_settings.SUPABASE_URL, app_settings.SUPABASE_KEY)
            bucket_name = "optimed-bills"
            
            # Upload to Supabase Storage
            supabase.storage.from_(bucket_name).upload(
                path=filename,
                file=contents,
                file_options={"content-type": file.content_type}
            )
            
            # Get public URL
            file_url = supabase.storage.from_(bucket_name).get_public_url(filename)
        except Exception as e:
            logger.error(f"Failed to upload to Supabase: {e}")
            
    if not file_url:
        # Fallback to local storage
        file_path = os.path.join("uploads", filename)
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(contents)
        file_url = f"/uploads/{filename}"

    # 4. Process with Hybrid OCR Pipeline
    try:
        extracted_data = await run_hybrid_ocr(contents, file.content_type)
        ocr_engine = extracted_data.get("ocr_engine", "unknown")
        logger.info(f"Bill {bill_id} processed with {ocr_engine}")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"OCR Processing Failed for {bill_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR Processing Failed: {str(e)}"
        )

    # 5. Validation & Scoring
    from app.services.validation_service import validate_bill_data, calculate_confidence_score
    validation_results = validate_bill_data(extracted_data)
    initial_score = extracted_data.get("confidence_score", 0.5)
    if isinstance(initial_score, str):
        try:
            initial_score = float(initial_score)
        except ValueError:
            initial_score = 0.5
    final_score = calculate_confidence_score(validation_results, initial_score)

    # 6. Determine status based on confidence
    bill_status = "completed" if final_score > 0.8 else "needs_review"

    # 7. Auto-create/update vendor
    vendor_id = _find_or_create_vendor(db, current_user.org_id, extracted_data)

    # 8. Update vendor auto-approval stats
    if vendor_id and bill_status == "completed":
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if vendor:
            vendor.auto_approved_bills += 1
            # Recalculate trust score
            if vendor.total_bills > 0:
                vendor.trust_score = round((vendor.auto_approved_bills / vendor.total_bills) * 100)

    # 9. Create Bill Record
    bill = Bill(
        id=bill_id,
        org_id=current_user.org_id,
        vendor_id=vendor_id,
        batch_id=batch_id,
        file_name=file.filename,
        file_type=file.content_type,
        file_url=file_url,
        status=bill_status,
        confidence_score=final_score,
        ocr_engine=ocr_engine,
        extracted_data=extracted_data,
        validation_results=validation_results
    )
    db.add(bill)

    # 10. Store individual line items
    _store_bill_items(db, bill_id, extracted_data)

    # 11. Audit log
    _create_audit(db, current_user, "UPLOAD_BILL", "BILL", bill_id, {
        "file_name": file.filename,
        "ocr_engine": ocr_engine,
        "confidence_score": final_score,
        "status": bill_status,
        "item_count": len(extracted_data.get("invoice_items", [])),
    })

    db.commit()
    db.refresh(bill)

    return bill


@router.get("/", response_model=List[BillSchema])
def read_bills(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by file name or vendor"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Retrieve bills for the user's organization."""
    query = db.query(Bill).filter(Bill.org_id == current_user.org_id)

    if status_filter:
        query = query.filter(Bill.status == status_filter)
    if search:
        query = query.filter(Bill.file_name.ilike(f"%{search}%"))

    bills = query.order_by(Bill.created_at.desc()).offset(skip).limit(limit).all()
    return bills


@router.get("/stats/summary")
def get_bill_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Get bill summary stats for the dashboard."""
    total_bills = db.query(func.count(Bill.id)).filter(Bill.org_id == current_user.org_id).scalar() or 0
    completed_bills = db.query(func.count(Bill.id)).filter(Bill.org_id == current_user.org_id, Bill.status == "completed").scalar() or 0
    review_bills = db.query(func.count(Bill.id)).filter(Bill.org_id == current_user.org_id, Bill.status == "needs_review").scalar() or 0
    failed_bills = db.query(func.count(Bill.id)).filter(Bill.org_id == current_user.org_id, Bill.status == "failed").scalar() or 0
    avg_confidence = db.query(func.avg(Bill.confidence_score)).filter(
        Bill.org_id == current_user.org_id,
        Bill.status.in_(["completed", "needs_review"])
    ).scalar() or 0.0

    return {
        "total_bills": total_bills,
        "completed": completed_bills,
        "needs_review": review_bills,
        "failed": failed_bills,
        "average_confidence": round(float(avg_confidence) * 100, 2)
    }


@router.get("/review-queue")
def get_review_queue(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Get bills that need review, sorted by confidence (lowest first)."""
    bills = db.query(Bill).filter(
        Bill.org_id == current_user.org_id,
        Bill.status == "needs_review"
    ).order_by(Bill.confidence_score.asc()).offset(skip).limit(limit).all()

    return [
        {
            "id": b.id,
            "org_id": b.org_id,
            "file_name": b.file_name,
            "file_type": b.file_type,
            "file_url": b.file_url,
            "status": b.status,
            "confidence_score": b.confidence_score,
            "ocr_engine": b.ocr_engine,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "extracted_data": b.extracted_data,
            "validation_results": b.validation_results,
            "vendor_name": (b.extracted_data or {}).get("seller_info", {}).get("supplier_name"),
        }
        for b in bills
    ]


@router.get("/{id}", response_model=BillSchema)
def read_bill(
    id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    bill = db.query(Bill).filter(Bill.id == id, Bill.org_id == current_user.org_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill


@router.put("/{id}", response_model=BillSchema)
def update_bill(
    id: str,
    bill_in: BillUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_admin)
) -> Any:
    bill = db.query(Bill).filter(Bill.id == id, Bill.org_id == current_user.org_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    if bill_in.extracted_data is not None:
        bill.extracted_data = bill_in.extracted_data
        # Re-run validation on update
        from app.services.validation_service import validate_bill_data, calculate_confidence_score
        validation_results = validate_bill_data(bill.extracted_data)
        bill.validation_results = validation_results
        initial_score = bill.extracted_data.get("confidence_score", 0.5)
        if isinstance(initial_score, str):
            try:
                initial_score = float(initial_score)
            except ValueError:
                initial_score = 0.5
        bill.confidence_score = calculate_confidence_score(validation_results, initial_score)

        # Re-store bill items
        db.query(BillItem).filter(BillItem.bill_id == id).delete()
        _store_bill_items(db, id, bill.extracted_data)

        # Re-check vendor
        new_vendor_id = _find_or_create_vendor(db, current_user.org_id, bill.extracted_data)
        if new_vendor_id:
            bill.vendor_id = new_vendor_id

    if bill_in.status is not None:
        bill.status = bill_in.status

    _create_audit(db, current_user, "UPDATE_BILL", "BILL", id, {
        "updated_fields": list(bill_in.model_dump(exclude_unset=True).keys()),
        "new_status": bill_in.status,
    })

    db.commit()
    db.refresh(bill)
    return bill


@router.delete("/{id}")
def delete_bill(
    id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_admin)
) -> Any:
    bill = db.query(Bill).filter(Bill.id == id, Bill.org_id == current_user.org_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    file_name = bill.file_name
    file_url = bill.file_url
    _create_audit(db, current_user, "DELETE_BILL", "BILL", id, {"file_name": file_name})

    db.delete(bill)
    db.commit()

    # Clean up uploaded file from disk
    if file_url:
        try:
            # Extract filename from URL (e.g., http://host/uploads/uuid.jpg → uuid.jpg)
            url_filename = file_url.rstrip('/').split('/')[-1]
            file_path = os.path.join("uploads", url_filename)
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Deleted uploaded file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to delete uploaded file for bill {id}: {e}")

    return {"message": "Bill deleted"}
