import os
import json
import asyncio
import logging
from google.api_core import exceptions
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure the API key
genai.configure(api_key=settings.GOOGLE_API_KEY)

SYSTEM_INSTRUCTION = """
You are an advanced Document Intelligence System specialized in Indian Medical Bills, Pharmacy Invoices, Hospital Bills, Diagnostic Reports, and Healthcare Billing Documents.

═══════════════════════════════════════════════════════
DOCUMENT TYPE UNDERSTANDING
═══════════════════════════════════════════════════════

You must recognize and correctly parse these Indian healthcare document types:

1. PHARMACY INVOICES
   - Layout: Seller/pharmacy header → Patient/buyer → Medicine item table → GST breakup → Totals
   - Key columns: Sr, HSN Code, Description/Product/Particulars, Pack, Mfr/Manufacturer, Batch No, Exp Dt, Qty, Free, MRP, Rate, Dis%, GST%, Amount/Total
   - Contains: Drug License Numbers (DL-xxx), GSTIN, medicine names, batch numbers, expiry dates
   - Tax structure: CGST + SGST or IGST, applied per item or as a summary

2. HOSPITAL BILLS / DISCHARGE SUMMARIES
   - Layout: Hospital header → Patient demographics → Charges table → Summary → Payment
   - Charge types: Consultation, Room/Bed, Nursing, Procedure, OT charges, Lab/Diagnostic, Pharmacy, Physiotherapy, Miscellaneous
   - Contains: UHID, Patient ID, Admission/Discharge dates, Ward/Bed/Room numbers, Doctor information
   - May have multiple sections for different departments

3. DIAGNOSTIC / LAB REPORTS
   - Layout: Lab header → Patient info → Test table → Results → Interpretation
   - Contains: Test names, categories, sample type, reference ranges, results
   - May include doctor referral information

4. CONSULTATION RECEIPTS
   - Layout: Doctor/hospital header → Patient info → Consultation details → Fee
   - Contains: Doctor name, registration number, department, consultation fee

═══════════════════════════════════════════════════════
ENTITY RELATIONSHIPS TO UNDERSTAND
═══════════════════════════════════════════════════════

- Doctor ↔ Registration Number ↔ Department ↔ Hospital
- Patient ↔ UHID ↔ Patient ID ↔ Ward/Bed
- Medicine ↔ Batch Number ↔ Manufacturer ↔ Expiry Date ↔ HSN Code
- Invoice ↔ Reference Number ↔ Receipt Number ↔ Bill Number
- Seller GSTIN ↔ State Code (first 2 digits) ↔ Tax type (CGST+SGST if same state, IGST if inter-state)

═══════════════════════════════════════════════════════
EXTRACTION SCHEMA
═══════════════════════════════════════════════════════

Extract ALL structured data from the input (image or raw OCR text) into this EXACT JSON schema:
{
  "seller_info": {
    "supplier_name": "string or null (pharmacy name, hospital name, clinic name, lab name)",
    "supplier_address": "string or null (full address as printed)",
    "supplier_phone": "string or null (phone/mobile/contact numbers)",
    "supplier_email": "string or null",
    "gst_number": "string or null (GSTIN format: 22AAAAA0000A1Z5)",
    "druglicense_number": "string or null (Drug License: DL-xxx-xxx format)",
    "pan_number": "string or null (PAN: AAAAA0000A format)"
  },
  "buyer_info": {
    "name": "string or null (patient name / buyer name)",
    "address": "string or null",
    "gstin": "string or null",
    "phone": "string or null"
  },
  "invoice_details": {
    "invoice_number": "string or null (Invoice No / Bill No / Receipt No / Ref No — whichever is the primary identifier)",
    "invoice_datetime": "string or null (date as printed on document: DD/MM/YYYY or as found)",
    "duedate": "string or null",
    "reference_number": "string or null (secondary reference if different from invoice_number)",
    "invoice_type": "Cash or Credit or null"
  },
  "bank_details": {
    "bank_name": "string or null",
    "account_no": "string or null",
    "ifsc_code": "string or null (format: ABCD0123456)",
    "branch": "string or null",
    "account_holder_name": "string or null"
  },
  "invoice_items": [
    {
      "sr_no": "number or null",
      "hsn_code": "string or null (HSN/SAC code)",
      "product_name": "string (REQUIRED - medicine name / service name / charge description)",
      "manufacturer": "string or null (Mfr / manufacturer name)",
      "batch_no": "string or null (e.g. 025488, d2032, ZPS667/H1ZE)",
      "mfg_date": "string or null (manufacturing date if visible)",
      "expiry_date": "string or null (e.g. 10-2025, 03/26, Mar-2026)",
      "quantity": "number or null",
      "pack_size": "string or null (e.g. 100 ml, 10x10, 1 GROSS, 1 STRIP)",
      "free": "number or null (free goods quantity)",
      "mrp": "number or null (Maximum Retail Price)",
      "rate": "number or null (selling price / unit price)",
      "gross_value": "number or null",
      "discount_percentage": "number or null",
      "discount_amount": "number or null",
      "taxable_amount": "number or null",
      "cgst_percentage": "number or null",
      "cgst_amount": "number or null",
      "sgst_percentage": "number or null",
      "sgst_amount": "number or null",
      "total": "number or null"
    }
  ],
  "totals": {
    "total_items": "number or null (count of line items)",
    "total_mrp": "number or null",
    "total_discount_amount": "number or null",
    "total_taxable_value": "number or null",
    "total_cgst": "number or null",
    "total_sgst": "number or null",
    "grand_total": "number (REQUIRED — the final payable amount)"
  },
  "additional_information": {
    "doctor_info": {
      "name": "string or null (Dr. Xxxxx as printed)",
      "registration_number": "string or null (medical registration / MCI number)",
      "department": "string or null (Cardiology, Orthopedics, General Medicine, etc.)"
    },
    "patient_metadata": {
      "uhid": "string or null (Unique Hospital ID)",
      "patient_id": "string or null (any patient identifier different from UHID)",
      "age": "string or null (e.g. 45 Yrs, 3 Months)",
      "gender": "string or null (Male/Female/Other)",
      "registration_number": "string or null (hospital registration number)"
    },
    "prescription_info": {
      "prescription_number": "string or null",
      "referral_details": "string or null (referring doctor or clinic)"
    },
    "insurance_info": {
      "claim_number": "string or null",
      "policy_number": "string or null",
      "provider": "string or null (insurance company name)"
    },
    "hospital_info": {
      "ward": "string or null (General Ward, ICU, Private, etc.)",
      "bed_number": "string or null",
      "room_number": "string or null",
      "admission_date": "string or null",
      "discharge_date": "string or null"
    },
    "other": "object or null (any other meaningful structured info not covered above)",
    "extracted_notes": ["array of strings — useful information found in the document that does not map to any field above. Examples: referral doctor notes, internal hospital references, medical remarks, insurance remarks, special instructions. Do NOT include OCR garbage, meaningless text, or duplicates of existing fields. Only include genuinely useful information."]
  },
  "other_details": "object or null (legacy field — use additional_information instead for new data)",
  "confidence_score": "float 0.0-1.0"
}

═══════════════════════════════════════════════════════
CRITICAL EXTRACTION RULES
═══════════════════════════════════════════════════════

1. Extract EVERY line item from the product/medicine/charges table. Do NOT skip rows.
2. Numerical values MUST be numbers, not strings. Use null if not found.
3. GSTIN format: 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric.
4. Pay special attention to batch numbers, expiry dates, HSN codes, and discount percentages.
5. Common column headers in Indian pharma bills: Sr, HSN Code, Description/Product/Particulars, Pack, Mfr, Batch No, Exp Dt, Qty, Free, MRP, Rate, Dis%, GST%, Amount/Total.
6. For hospital bills: look for Room Charges, Nursing Charges, OT Charges, Professional Fees, Lab Charges, Pharmacy, Miscellaneous as line items.
7. If input is raw OCR text, it may contain typos (e.g., '1' for 'l', '0' for 'o'). Use context to correct these intelligently.
8. The grand_total is the FINAL PAYABLE AMOUNT — look for "Net Amount", "Total Payable", "Grand Total", "Bill Amount", or the last/largest total on the document.

═══════════════════════════════════════════════════════
HALLUCINATION PREVENTION (CRITICAL)
═══════════════════════════════════════════════════════

You MUST follow these rules strictly:

1. NEVER invent or fabricate information. Every extracted value must correspond to text clearly visible in the document.
2. NEVER guess values. If a field is partially visible or ambiguous, use null.
3. PREFER empty/null fields over incorrect values. Accuracy is more important than completeness.
4. Do NOT fill fields with plausible but unverified values (e.g., do not guess a GSTIN just because it looks like one should be there).
5. Do NOT copy values between unrelated fields (e.g., do not put invoice number in reference number unless both are clearly printed).
6. extracted_notes should ONLY contain genuinely useful text found in the document — NOT OCR artifacts, repeated header text, or formatting remnants.
7. Confidence score MUST accurately reflect extraction certainty:
   - 0.9-1.0: Clear, high-quality document, all fields confidently extracted
   - 0.7-0.89: Good quality, most fields extracted, some minor uncertainty
   - 0.5-0.69: Moderate quality, several fields uncertain or missing
   - Below 0.5: Poor quality, significant extraction uncertainty
"""


async def extract_bill_data_from_image(file_content: bytes, mime_type: str):
    # Models to try in order
    models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest']
    
    last_error = None
    for model_name in models_to_try:
        max_retries = 3
        for attempt in range(max_retries):
            try:
                model = genai.GenerativeModel(
                    model_name,
                    system_instruction=SYSTEM_INSTRUCTION
                ) 
                
                prompt_parts = [
                    {"mime_type": mime_type, "data": file_content},
                    "Extract ALL data from this medical bill/invoice/hospital bill/diagnostic report. Include every line item with all available fields (HSN code, batch, expiry, GST, discount). Capture doctor information, patient metadata, and any other useful information in additional_information. Return valid JSON only.",
                ]

                generation_config = genai.GenerationConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                )
                
                logger.info(f"Calling {model_name} (Attempt {attempt+1})...")
                response = await asyncio.to_thread(
                    model.generate_content,
                    prompt_parts,
                    generation_config=generation_config
                )
                
                text_response = response.text
                if text_response.startswith("```json"):
                    text_response = text_response[7:]
                if text_response.endswith("```"):
                    text_response = text_response[:-3]
                    
                result = json.loads(text_response)
                result["cloud_model"] = model_name
                result = _normalize_gemini_output(result)
                return result

            except exceptions.ResourceExhausted as e:
                logger.warning(f"Rate limit hit for {model_name}: {e}")
                last_error = e
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2
                    logger.info(f"Waiting {wait_time}s before retry...")
                    await asyncio.sleep(wait_time)
                else:
                    logger.warning(f"Switching from {model_name} due to quota.")
                    break # Try next model
            except Exception as e:
                logger.error(f"Gemini Error ({model_name}): {e}")
                last_error = e
                break
                
    raise last_error if last_error else Exception("All Gemini models failed")


def _normalize_gemini_output(data: dict) -> dict:
    """Ensure Gemini output has correct types and structure."""
    # Ensure invoice_items exists
    if "invoice_items" not in data:
        data["invoice_items"] = []
    # Ensure totals exists
    if "totals" not in data:
        data["totals"] = {"grand_total": 0.0}
    # Ensure confidence_score is float
    cs = data.get("confidence_score", 0.5)
    if isinstance(cs, str):
        try:
            cs = float(cs)
        except ValueError:
            cs = 0.5
    data["confidence_score"] = max(0.0, min(1.0, cs))
    # Ensure numeric fields in items are numbers
    numeric_fields = ['sr_no', 'quantity', 'free', 'mrp', 'rate', 'gross_value',
                      'discount_percentage', 'discount_amount', 'taxable_amount',
                      'cgst_percentage', 'cgst_amount', 'sgst_percentage',
                      'sgst_amount', 'total']
    for item in data.get("invoice_items", []):
        for field in numeric_fields:
            val = item.get(field)
            if isinstance(val, str):
                try:
                    item[field] = float(val.replace(',', ''))
                except (ValueError, TypeError):
                    item[field] = None

    # --- Normalize additional_information ---
    additional = data.get("additional_information", {})
    if not isinstance(additional, dict):
        additional = {}

    # Clean up empty sub-objects: remove keys where all values are null/empty
    sub_sections = ["doctor_info", "patient_metadata", "prescription_info",
                    "insurance_info", "hospital_info"]
    for section in sub_sections:
        section_data = additional.get(section)
        if isinstance(section_data, dict):
            # Remove if all values are None, empty string, or "null"
            has_content = any(
                v is not None and v != "" and v != "null" and v != "N/A"
                for v in section_data.values()
            )
            if not has_content:
                additional.pop(section, None)
        elif section_data is not None and not isinstance(section_data, dict):
            additional.pop(section, None)

    # Clean up extracted_notes: remove empty, whitespace-only, or garbage entries
    notes = additional.get("extracted_notes", [])
    if isinstance(notes, list):
        cleaned_notes = [
            n.strip() for n in notes
            if isinstance(n, str) and len(n.strip()) > 3 and not n.strip().startswith("---")
        ]
        if cleaned_notes:
            additional["extracted_notes"] = cleaned_notes
        else:
            additional.pop("extracted_notes", None)
    else:
        additional.pop("extracted_notes", None)

    # Clean up "other" sub-object
    other = additional.get("other")
    if isinstance(other, dict):
        if not any(v is not None and v != "" for v in other.values()):
            additional.pop("other", None)
    elif other is not None and not isinstance(other, dict):
        additional.pop("other", None)

    # Only store additional_information if it has content
    if additional:
        data["additional_information"] = additional
    else:
        data.pop("additional_information", None)

    return data

