from fastapi import APIRouter
from app.api.v1.endpoints import auth, bills, vendors, analytics, audit_logs, users

api_router = APIRouter()
api_router.include_router(auth.router, tags=["login"])
api_router.include_router(bills.router, prefix="/bills", tags=["bills"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["vendors"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
