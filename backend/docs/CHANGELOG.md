# CHANGELOG — CONSTRUCTOPS
All notable changes to the ConstructOps platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0-rc1] - 2026-10-12
### Downloadable Reports
- **Added:** Excel + PDF export of the full project detail — contractors with their assigned projects, contract/budget amounts, paid vs balance and milestones, materials in/out/remaining with the movement log, day-by-day daily reports, worker names, roles, daily wages, present/absent days and payable wages, expenses, contractor payments, and alerts.
  - `backend/src/services/exportData.js` — single data bundle used by both formats and both scopes (access control lives here, not in the callers).
  - `backend/src/services/exportWorkbook.js` — ExcelJS writer (per-section sheets + embedded site photos).
  - `backend/src/services/exportPdf.js` — PDFKit writer (A4 landscape, photo blocks).
- **Added:** Site photos attached by contractors are embedded in both formats when stored as data URIs; projects with no images export normally without them.
- **Added:** Endpoints `GET /api/v1/export/projects/:id/:format` and `GET /api/v1/export/company/:format` (see `API_DOCUMENTATION.md` §6).
- **Added:** `frontend/src/components/ExportButtons.jsx` — Excel/PDF download pair wired into the owner's company dashboard (all projects) and each project detail page.
- **Security:** Tenant isolation is enforced per bundle (`canAccessProject`); a contractor can only export projects they are assigned to. Remote image URLs are never fetched server-side.

### Repository Layout
- **Changed:** Repo root now holds only `frontend/` and `backend/`. The Vercel catch-all, `vercel.json`, `docs/`, and `.planning/` moved under `backend/`; the wrapper root `package.json` was removed and its scripts folded into `backend/package.json`.

---

## [1.0.0-rc1] - 2026-10-11
### Security & Tenant Hardening
- **Fixed:** Eliminated insecure fallback JWT secret in `auth.middleware.js` and `auth.controller.js`. System now aborts server boot if `JWT_SECRET` is not set.
- **Added:** Enforced strong password policy validation during user registration (minimum 8 characters, alphanumeric required).
- **Added:** Enforced 1-hour access token expiration for session security.
- **Added:** Multi-tenant data isolation checks across:
  - `expense.controller.js`: Verified parent project company ownership before creating, reading, updating, or deleting expenses.
  - `worker.controller.js`: Verified project company ownership for worker profiles and attendance muster.
  - `material.controller.js`: Enforced tenant boundary on material definitions, inventory counts, and audit logs.
  - `report.controller.js`: Enforced tenant boundary on daily site reports and risk detection.
  - `alert.controller.js`: Scoped alert notifications and mark-as-read mutations strictly to the user's company.
  - `dashboard.routes.js`: Scoped attendance queries and project metrics strictly to company projects.

### Engineering & Documentation
- **Added:** Comprehensive documentation suite in `/docs`:
  - `PROJECT_AUDIT.md`: Complete audit of existing codebase, defect severity matrix, and resolution log.
  - `ARCHITECTURE.md`: Topology diagram, multi-tenancy model, RBAC matrix, and database indexing rules.
  - `IMPLEMENTATION_ROADMAP.md`: Phased roadmap from security to investor readiness.
  - `SECURITY_AUDIT.md`: Threat model analysis and hardening checklists.
  - `API_DOCUMENTATION.md`: Endpoint schemas, request/response payloads, and authentication rules.
  - `DATA_MODEL.md`: Full Mongoose schema specifications and compound indexing constraints.
  - `BUSINESS_MODEL.md`: Customer pain points, value proposition, pricing tiers, and unit economics.
  - `INVESTOR_READINESS.md`: 12-slide pitch deck structure, due diligence checklist, and investment highlights.
  - `DEPLOYMENT_GUIDE.md`: Environment configuration, local setup, and deployment options.
  - `TESTING_STRATEGY.md`: Test pyramid, multi-tenant test matrix, and release gates.
- **Fixed:** Resolved missing dependencies in frontend; verified clean production build via `npm ci` and `npm run build`.
