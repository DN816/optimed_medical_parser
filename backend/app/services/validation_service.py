"""
Comprehensive validation service for extracted bill data.
Validates mandatory fields, GSTIN format, date formats, math consistency,
and item-level integrity.
"""

import re
from typing import Dict, Any, List
from datetime import datetime


def validate_bill_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates extracted bill data against business rules.
    Returns a dictionary with isValid, errors, and warnings.
    """
    errors: Dict[str, List[str]] = {}
    warnings: Dict[str, List[str]] = {}

    def add_error(field: str, msg: str):
        if field not in errors:
            errors[field] = []
        errors[field].append(msg)

    def add_warning(field: str, msg: str):
        if field not in warnings:
            warnings[field] = []
        warnings[field].append(msg)

    seller = data.get("seller_info", {})
    buyer = data.get("buyer_info", {})
    invoice = data.get("invoice_details", {})
    totals = data.get("totals", {})
    items = data.get("invoice_items", [])
    bank = data.get("bank_details", {})

    # ── 1. Mandatory Fields ──
    if not seller.get("supplier_name"):
        add_error("supplier_name", "Supplier Name is missing")
    if not invoice.get("invoice_number"):
        add_warning("invoice_number", "Invoice Number is missing")

    grand_total = totals.get("grand_total")
    if grand_total is None or grand_total == 0:
        add_error("grand_total", "Grand Total is missing or zero")

    # ── 2. GSTIN Validation ──
    gstin = seller.get("gst_number")
    if gstin:
        gstin_pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        if not re.match(gstin_pattern, gstin.upper()):
            add_warning("gst_number", f"Invalid GSTIN format: {gstin}")

    buyer_gstin = buyer.get("gstin")
    if buyer_gstin:
        if not re.match(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$', buyer_gstin.upper()):
            add_warning("buyer_gstin", f"Invalid buyer GSTIN format: {buyer_gstin}")

    # ── 3. Date Validation ──
    inv_date = invoice.get("invoice_datetime")
    if inv_date:
        date_pattern = r'^(\d{2}[-/.]\d{2}[-/.]\d{4}|\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/][A-Z]{3}[-/]\d{4})$'
        if not re.match(date_pattern, inv_date, re.IGNORECASE):
            add_warning("invoice_datetime", f"Unrecognized date format: {inv_date}")

    # ── 4. Item-Level Validation ──
    if not items:
        add_warning("invoice_items", "No line items extracted")
    else:
        for i, item in enumerate(items):
            prefix = f"invoice_items[{i}]"

            # Product name is required
            if not item.get("product_name"):
                add_warning(prefix, "Product name is missing")

            qty = _to_float(item.get("quantity"))
            rate = _to_float(item.get("rate"))
            item_total = _to_float(item.get("total") or item.get("taxable_amount"))

            # Math consistency: qty * rate ≈ total
            if qty and qty > 0 and rate and rate > 0 and item_total and item_total > 0:
                expected_total = qty * rate
                discount = _to_float(item.get("discount_amount")) or 0
                expected_after_discount = expected_total - discount

                if abs(expected_after_discount - item_total) > max(2.0, item_total * 0.05):
                    add_warning(prefix, f"Math mismatch: {qty} × {rate} - {discount} = {expected_after_discount:.2f}, but total is {item_total}")

            # Expiry date validation
            expiry = item.get("expiry_date")
            if expiry:
                try:
                    for fmt in ['%m/%y', '%m/%Y', '%d/%m/%Y', '%m-%y', '%m-%Y']:
                        try:
                            exp_date = datetime.strptime(expiry, fmt)
                            if exp_date < datetime.now():
                                add_warning(prefix, f"Medicine '{item.get('product_name', '?')}' may be expired: {expiry}")
                            break
                        except ValueError:
                            continue
                except Exception:
                    pass

    # ── 5. Total Consistency ──
    if items and grand_total and grand_total > 0:
        calculated_subtotal = sum(_to_float(item.get("total") or item.get("taxable_amount")) or 0 for item in items)

        if calculated_subtotal > 0:
            # Allow some tolerance for GST added on top
            total_tax = (_to_float(totals.get("total_cgst")) or 0) + (_to_float(totals.get("total_sgst")) or 0)
            expected_grand = calculated_subtotal + total_tax

            if abs(calculated_subtotal - grand_total) > max(5.0, grand_total * 0.1):
                if total_tax > 0:
                    if abs(expected_grand - grand_total) > max(5.0, grand_total * 0.1):
                        add_warning("grand_total", f"Grand total ({grand_total}) doesn't match sum of items ({calculated_subtotal}) + tax ({total_tax})")
                else:
                    add_warning("grand_total", f"Sum of item totals ({calculated_subtotal:.2f}) differs from grand total ({grand_total})")

    # ── 6. Bank Details Validation ──
    ifsc = bank.get("ifsc_code")
    if ifsc:
        if not re.match(r'^[A-Z]{4}0[A-Z0-9]{6}$', ifsc.upper()):
            add_warning("ifsc_code", f"Invalid IFSC format: {ifsc}")

    return {
        "isValid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
    }


def _to_float(val) -> float:
    """Safely convert to float."""
    if val is None:
        return 0.0
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def calculate_confidence_score(validation: Dict[str, Any], llm_score: float) -> float:
    """
    Calculates a deterministic confidence score based on validation results
    and the OCR engine's own confidence assessment.
    """
    if isinstance(llm_score, str):
        try:
            llm_score = float(llm_score)
        except ValueError:
            llm_score = 0.5

    # Clamp llm_score to 0-1
    llm_score = max(0.0, min(1.0, llm_score))

    # Weighted combination
    score = 0.4 + llm_score * 0.6

    # Penalize errors heavily
    error_count = sum(len(v) for v in validation.get("errors", {}).values())
    warning_count = sum(len(v) for v in validation.get("warnings", {}).values())

    score -= (error_count * 0.15)
    score -= (warning_count * 0.03)

    return max(0.1, min(1.0, round(score, 3)))
