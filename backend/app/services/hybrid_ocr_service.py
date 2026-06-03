"""
Hybrid OCR Service — Gemini Vision Only

Pipeline:
1. Image bytes sent directly to Gemini Vision
2. Gemini extracts structured bill JSON from the image
3. Result returned with ocr_engine = "gemini"
"""

import logging
from typing import Dict, Any
from fastapi import HTTPException

from app.services.gemini_service import extract_bill_data_from_image

logger = logging.getLogger(__name__)


async def run_hybrid_ocr(image_bytes: bytes, mime_type: str, confidence_threshold: float = None) -> Dict[str, Any]:
    """
    Main entry point for bill extraction.
    Sends the image directly to Gemini Vision for structured data extraction.
    """
    try:
        result = await extract_bill_data_from_image(image_bytes, mime_type)
        result["ocr_engine"] = "gemini"
        logger.info(
            f"Gemini Vision extraction completed. "
            f"Items: {len(result.get('invoice_items', []))}. "
            f"Confidence: {result.get('confidence_score', 0):.2f}"
        )
        return result
    except Exception as e:
        logger.error(f"Gemini Vision extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"OCR Process Failed: {str(e)}")
