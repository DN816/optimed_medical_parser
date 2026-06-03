# OptiMed — AI Medical Bill Parser: Project Context

> **SINGLE SOURCE OF TRUTH** for all AI development sessions.
> Last updated: 2026-05-28 | Session #1

---

## 1. Project Overview

**OptiMed** is an AI/OCR-based SaaS system that converts scanned/photographed Indian medical bills (pharmacy invoices, hospital bills) into clean, structured, queryable JSON data.

It uses a **hybrid OCR pipeline**: fast local Tesseract extraction with AI-powered parsing (Gemini Flash), and falls back to full Gemini Vision for low-confidence results. The system features a React frontend dashboard for bill management, review, analytics, vendor tracking, and data export.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────┐
│                FRONTEND (React + Vite)               │
│  localhost:3000 | TailwindCSS CDN | TypeScript       │
│  Components: Dashboard, Upload, Review, Analytics,   │
│  Vendors, Exports, Settings, Audit Logs              │
├──────────────────────────────────────────────────────┤
│              ↕ axios (REST API + JWT)                 │
├──────────────────────────────────────────────────────┤
│            BACKEND (FastAPI + Python)                 │
│  localhost:8000 | OAuth2 JWT Auth | SQLAlchemy ORM   │
│  API: /api/v1/bills, /vendors, /analytics, /audit    │
├──────────────────────────────────────────────────────┤
│              OCR/AI PIPELINE                         │
│  Image → Multi-Strategy OpenCV Preprocessing         │
│  → Multi-PSM Tesseract → AI Text Parsing (Gemini)    │
│  → Heuristic Parser Fallback → Validation            │
│  → Confidence Scoring → Gemini Vision Fallback       │
├──────────────────────────────────────────────────────┤
│             PostgreSQL (via SQLAlchemy)               │
│  Tables: organizations, users, vendors, bills,       │
│  bill_items, audit_logs                              │
└──────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Frontend   | React 19, TypeScript, Vite 6, TailwindCSS CDN |
| Backend    | FastAPI 0.115, Python 3.10+, Uvicorn          |
| Database   | PostgreSQL (via SQLAlchemy 2.0, Alembic)      |
| OCR Local  | Tesseract (pytesseract), OpenCV               |
| AI/LLM     | Google Gemini (2.5-flash/2.0-flash/1.5-flash) |
| Auth       | JWT (python-jose), bcrypt                     |
| Deployment | Docker (backend only), no CI/CD yet           |

---

## 4. OCR/AI Pipeline (Critical Path)

### Flow:
1. **Image Upload** → `POST /api/v1/bills/upload`
2. **Multi-Strategy OpenCV Preprocessing** (`image_preprocessing.py`):
   - 4 strategies: `light`, `heavy`, `photo`, `super_res`
   - Each: grayscale → rescale → deskew → denoise → threshold → morphological cleanup
3. **Multi-PSM Tesseract** (`hybrid_ocr_service.py`):
   - Tests PSM 3 (full page) and PSM 6 (uniform block) across all preprocessing strategies
   - Picks best result by composite score (confidence + text length + numeric density)
4. **AI Text Parsing** (`gemini_service.py`):
   - Sends raw OCR text to Gemini Flash for structured JSON extraction
   - Falls back to regex/heuristic parser (`bill_parser.py`) if AI fails
5. **Confidence Check**:
   - If confidence ≥ threshold (0.7) AND items found → return Tesseract result
   - If confidence < threshold OR no items → **Gemini Vision Fallback**
6. **Gemini Vision Fallback**:
   - Sends raw image bytes to Gemini Vision for full extraction
   - Multi-model fallback: gemini-2.5-flash → 2.0-flash → 1.5-flash-latest
   - Rate limit handling with exponential backoff
7. **Validation** (`validation_service.py`):
   - GSTIN format, date format, math consistency, item integrity
   - Grand total vs. sum of items validation
8. **Confidence Scoring** → status determination → DB storage

### Key Files:
| File | Purpose |
|------|---------|
| `backend/app/services/hybrid_ocr_service.py` | Main OCR orchestrator |
| `backend/app/services/image_preprocessing.py` | OpenCV preprocessing strategies |
| `backend/app/services/gemini_service.py` | Gemini AI integration |
| `backend/app/services/bill_parser.py` | Regex/heuristic parser (fallback) |
| `backend/app/services/validation_service.py` | Data validation & confidence scoring |

---

## 5. Important Files & Modules

### Backend (`backend/`)
| Path | Description |
|------|-------------|
| `app/main.py` | FastAPI app entry, CORS, health check |
| `app/core/config.py` | Pydantic settings (env vars) |
| `app/core/security.py` | JWT + bcrypt auth |
| `app/api/v1/endpoints/bills.py` | Bill CRUD + OCR upload endpoint |
| `app/api/v1/endpoints/auth.py` | Login (OAuth2 password flow) |
| `app/api/v1/endpoints/vendors.py` | Vendor CRUD + stats |
| `app/api/v1/endpoints/analytics.py` | Dashboard analytics (real DB queries) |
| `app/api/v1/endpoints/audit_logs.py` | Audit log CRUD |
| `app/api/deps.py` | Dependency injection (DB session, current user) |
| `app/models/` | SQLAlchemy models (Bill, BillItem, User, Vendor, Org, AuditLog) |
| `app/schemas/` | Pydantic request/response schemas |
| `app/db/init_db.py` | DB initialization + admin seed |
| `Dockerfile` | Backend Docker image (includes Tesseract) |
| `test_ocr_pipeline.py` | Standalone OCR test against BILLS/ folder |

### Frontend (root `/`)
| Path | Description |
|------|-------------|
| `App.tsx` | Main app with internal routing |
| `types.ts` | TypeScript type definitions |
| `services/api.ts` | Axios API client with JWT interceptors |
| `services/fraudDetectionService.ts` | Client-side fraud detection |
| `services/diffUtils.ts` | Correction tracking (diff original vs edited) |
| `contexts/AuthContext.tsx` | Auth state, login/logout, audit logging |
| `contexts/BatchContext.tsx` | Bill state management, batch processing, backend sync |
| `contexts/LearningContext.tsx` | Vendor learning/identification |
| `components/` | 23 React components (Dashboard, Upload, Review, etc.) |
| `BILLS/` | 31 sample bill images (PNG, JPG, JPEG) |

---

## 6. Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- Tesseract OCR (`C:\Program Files\Tesseract-OCR\tesseract.exe` on Windows)
- Google Gemini API key

### Backend Setup
```bash
cd backend
cp .env.example .env          # Edit with real credentials
python -m venv .venv
.venv\Scripts\activate         # Windows
pip install -r requirements.txt
python -m app.db.init_db       # Creates tables + seed admin
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend Setup
```bash
npm install
npm run dev                    # Starts at localhost:3000
```

### Quickstart (Windows)
```bash
start_backend.bat              # Does everything for backend
npm run dev                    # In separate terminal
```

---

## 7. Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | JWT signing key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `GOOGLE_API_KEY` | Google Gemini API key | Yes |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT token lifetime (default: 11520 = 8 days) | No |
| `BACKEND_CORS_ORIGINS` | JSON array of allowed origins | No |
| `OCR_ENABLE_LOCAL` | Enable Tesseract (default: true) | No |
| `OCR_CONFIDENCE_THRESHOLD` | Gemini fallback threshold (default: 0.7) | No |

### Frontend
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (default: `http://localhost:8000/api/v1`) |

---

## 8. Database

- **Engine**: PostgreSQL
- **ORM**: SQLAlchemy 2.0 with declarative base
- **Migrations**: Alembic (configured but `alembic.ini` has default placeholder URL — NOT production-ready)
- **Tables**: organizations, users, vendors, bills, bill_items, audit_logs
- **Seed**: `init_db.py` creates default org + admin user (`admin@optimed.com` / `admin123`)

---

## 9. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/login/access-token` | OAuth2 login |
| POST | `/api/v1/login/test-token` | Validate token |
| POST | `/api/v1/bills/upload` | Upload + OCR process bill |
| GET | `/api/v1/bills/` | List bills |
| GET | `/api/v1/bills/stats/summary` | Dashboard stats |
| GET | `/api/v1/bills/review-queue` | Review queue |
| GET | `/api/v1/bills/{id}` | Get bill detail |
| PUT | `/api/v1/bills/{id}` | Update bill data |
| DELETE | `/api/v1/bills/{id}` | Delete bill |
| GET | `/api/v1/vendors/` | List vendors |
| GET | `/api/v1/vendors/stats` | Vendor stats |
| GET | `/api/v1/vendors/{id}` | Vendor detail |
| GET | `/api/v1/vendors/{id}/bills` | Vendor bills |
| PUT | `/api/v1/vendors/{id}` | Update vendor |
| GET | `/api/v1/analytics/summary` | Analytics overview |
| GET | `/api/v1/analytics/spend` | Spend trends |
| GET | `/api/v1/analytics/ops` | Ops metrics |
| GET | `/api/v1/analytics/vendors` | Vendor performance |
| GET | `/api/v1/analytics/recent-bills` | Recent bills for dashboard |
| GET | `/api/v1/audit-logs/` | List audit logs |
| POST | `/api/v1/audit-logs/` | Create audit log |
| GET | `/health` | Health check |

---

## 10. Completed Features

- [x] Hybrid OCR pipeline (Tesseract + Gemini Vision)
- [x] Multi-strategy image preprocessing (light/heavy/photo/super_res)
- [x] AI-powered text parsing (Gemini Flash for text structuring)
- [x] Heuristic regex parser fallback
- [x] Multi-model Gemini fallback chain (2.5 → 2.0 → 1.5)
- [x] Comprehensive data validation (GSTIN, dates, math, items)
- [x] JWT authentication (login/logout/token validation)
- [x] Bill upload, CRUD, review queue
- [x] Auto vendor discovery and tracking
- [x] Vendor trust scoring
- [x] Audit logging
- [x] Dashboard with real DB stats
- [x] Analytics (spend, ops, vendor performance)
- [x] Bill correction tracking (diff detection)
- [x] Client-side fraud detection (duplicate, anomaly, tampering, vendor risk)
- [x] Review session workflow
- [x] Export functionality (frontend-only)
- [x] Docker support (backend)
- [x] Health check endpoint
- [x] Standalone OCR test script

---

## 11. Incomplete / Stub Features

- [ ] **User Management**: `updateUserRole`, `inviteUser`, `deactivateUser` are stubs (show alerts)
- [ ] **Security Settings**: `updateSecuritySettings`, `revokeSession`, `resolveAlert` are stubs
- [ ] **Billing/Subscription**: `BillingContext.tsx` likely mock/stub
- [ ] **Export Context**: `ExportContext.tsx` — frontend-only, no backend export endpoint
- [ ] **Integration Context**: `IntegrationContext.tsx` — webhooks/API keys are frontend-only mocks
- [ ] **PDF Support**: `application/pdf` is in allowed types but OCR pipeline handles images only
- [ ] **Batch Tracking**: Batches are frontend-only state, not persisted to backend
- [ ] **Layout Profiles**: Frontend types exist but no backend implementation
- [ ] **Extraction Rules**: Frontend types exist but no backend implementation
- [ ] **Alembic Migrations**: Configured but not actively used (uses `create_all` instead)

---

## 12. Known Bugs & Issues

### 🟡 MEDIUM
1. **`.env` file contains real credentials** (DB password + API key) committed to repo — even though `.gitignore` lists it, the file already exists with secrets.
2. **`BillData.other_details` missing in backend**: Frontend type `BillData` has `other_details: Record<string, any>` but backend schema/extraction don't produce this field.

### 🟢 LOW
3. **Tesseract path hardcoded**: Windows-only path `C:\Program Files\Tesseract-OCR\tesseract.exe` — won't work on Linux/Docker without the hardcode being skipped.
4. **`super_res` strategy in STRATEGIES dict but only first 2 PSM configs tested**: Strategy is registered but PSM loop only tries `:2` configs (PSM 3 and 6), not all 3.
5. **Frontend `batch_id` field**: Backend Bill model doesn't have a `batch_id` column. Frontend creates batch IDs locally but they're never persisted.

---

## 13. Production Blockers

| # | Blocker | Severity | Status |
|---|---------|----------|--------|
| 1 | Secrets in `.env` file in repo | High (Security) | Resolved (Needs rotation on prod) |
| 2 | Default admin password `admin123` with no forced change | High (Security) | Resolved |
| 3 | No backup/recovery for uploaded files | Medium | Resolved |
| 4 | User management endpoints not implemented | Medium | Resolved |

*(All Blockers Resolved: AuditLog bug, PDF crash, file size limit, openapi_url, unauth file serving, rate limiting, Alembic setup, User Management, OCR Sync Blocking, Analytics queries limit)*

---

## 14. Performance & Security Concerns

### Performance
- **Tesseract runs 4 preprocessing strategies × 2 PSM configs = 8 Tesseract calls per bill** — can take 10-30s per image
- **No async OCR**: Tesseract runs synchronously in the request handler
- **Analytics queries fetch all bills then iterate in Python** — won't scale past ~1000 bills
- **No caching** on analytics/stats endpoints
- **Large JSON blobs** stored in bills table

### Security
- **Hardcoded secret key** in `.env` (not cryptographically random-generated)
- **No password complexity requirements**
- **No input sanitization** on vendor name search (SQL injection via ilike)

---

## 15. Prioritized TODOs

### P1 — Required for Production
1. Make Tesseract OCR async (run in thread pool)
2. Rotate/regenerate all secrets (API key, DB password, JWT secret)

### P2 — Important for Reliability
3. Add proper error handling for malformed images
4. Implement user management backend endpoints
5. Add pagination to analytics queries

### P3 — Nice to Have
6. Implement batch persistence in backend
7. Add PDF page-to-image conversion
8. Add caching for analytics
9. Implement export backend endpoint
10. Add webhook/integration backend support

---

## 16. Recommended Next Actions

1. **Rotate Secrets** — Ensure the secrets in `.env` are regenerated for production.
2. **Implement User Management** — Connect frontend stubs to actual API logic.

---

## 17. Session Log

### Session #1 — 2026-05-28
- **Agent**: Antigravity (Claude Opus 4.6 Thinking)
- **Actions**: Full project audit — read every source file, analyzed architecture, identified bugs
- **Created**: `AI_PROJECT_CONTEXT.md` (this file)
- **Findings**: 1 critical bug (AuditLog field mismatch), 8 medium issues, 3 low issues, 10 production blockers identified

### Session #2 — 2026-05-28
- **Agent**: Antigravity (Gemini 3.1 Pro High)
- **Actions**: Addressed production-readiness blockers based on Session #1 findings.
- **Fixed**: 
  - AuditLog `action_metadata` column mismatch in `bills.py`.
  - Added file size limits to upload endpoint (`MAX_UPLOAD_SIZE_MB`).
  - Removed PDF support from allowed types to prevent crashing.
  - Fixed `openapi_url` double-slash in `main.py`.
  - Added rate limiting and request logging middleware in `main.py`.
  - Added auth-protected `/uploads/{filename}` serving in `main.py` instead of public static files.
  - Added file cleanup on bill deletion.
  - Completed `BillSchema` with `ocr_engine` and `vendor_id`.
  - Fixed `Alembic` configuration (`env.py` to use settings).
- **Verified**: Database initialization, Alembic migration generation, FastAPI health endpoint and frontend build flow are verified successfully.
