from fastapi import FastAPI, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.cors import CORSMiddleware
import os
import time
import logging
import shutil

from app.api.v1.api import api_router
from app.api.deps import get_current_user
from app.core.config import settings

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version="1.0.0",
    description="Medical Bill OCR SaaS API with Hybrid OCR (Tesseract + Gemini)"
)

@app.on_event("startup")
def on_startup():
    """Auto-create database tables and seed admin user on first run."""
    from app.db.init_db import init_db
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)

# ── Request Logging Middleware ──
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = round((time.time() - start_time) * 1000, 2)
    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} ({duration}ms)"
    )
    return response

# ── Simple Rate Limiting Middleware ──
# In-memory store — for production use Redis
_rate_limit_store: dict = {}

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Only rate-limit auth and upload endpoints
    path = request.url.path
    if "/login/" in path or "/upload" in path:
        client_ip = request.client.host if request.client else "unknown"
        key = f"{client_ip}:{path}"
        now = time.time()
        
        # Clean old entries
        window = 60  # 1 minute window
        _rate_limit_store[key] = [
            t for t in _rate_limit_store.get(key, []) if now - t < window
        ]
        
        # Check limit
        max_requests = 10 if "/login/" in path else 30  # 10 logins/min, 30 uploads/min
        if len(_rate_limit_store.get(key, [])) >= max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."}
            )
        
        _rate_limit_store.setdefault(key, []).append(now)
    
    return await call_next(request)

# ── CORS ──
if settings.BACKEND_CORS_ORIGINS:
    origins = [str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS]
    # Add explicit 127.0.0.1 variants just in case
    origins.extend(["http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://localhost:3000", "http://localhost:5173"])
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

# ── Auth-Protected File Serving ──
# Instead of mounting static files publicly, serve through an authenticated endpoint
@app.get("/uploads/{filename}")
async def serve_upload(
    filename: str,
    current_user = Depends(get_current_user)
):
    """Serve uploaded bill images — requires authentication."""
    file_path = os.path.join("uploads", filename)
    if not os.path.exists(file_path):
        return JSONResponse(status_code=404, content={"detail": "File not found"})
    # Prevent directory traversal
    real_path = os.path.realpath(file_path)
    uploads_dir = os.path.realpath("uploads")
    if not real_path.startswith(uploads_dir):
        return JSONResponse(status_code=403, content={"detail": "Access denied"})
    return FileResponse(file_path)


@app.get("/")
def root():
    return {
        "message": "Welcome to Optimed API",
        "version": "1.0.0",
        "docs": f"{settings.API_V1_STR}/docs",
        "openapi": f"{settings.API_V1_STR}/openapi.json"
    }

@app.get("/health")
def health_check():
    """
    Comprehensive health check endpoint.
    Reports status of all critical services.
    """
    from sqlalchemy import text
    from app.db.session import SessionLocal
    
    health = {
        "status": "healthy",
        "services": {
            "api": "up",
            "database": "unknown",
            "ocr_gemini": "available" if settings.GOOGLE_API_KEY else "not_configured",
        },
        "config": {
            "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB,
        }
    }
    
    # Check database
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        health["services"]["database"] = "up"
    except Exception as e:
        health["services"]["database"] = f"down: {str(e)}"
        health["status"] = "degraded"
    return health
