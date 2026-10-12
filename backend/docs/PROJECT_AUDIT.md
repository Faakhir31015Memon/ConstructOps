# PROJECT AUDIT REPORT — CONSTRUCTOPS
**Date:** October 2026  
**Status:** Baseline Established & Hardening In Progress  
**Scope:** Architecture, Security, Data Isolation, Workflows & Production Readiness

---

## 1. Executive Summary
ConstructOps is an operations and management SaaS platform tailored for general contractors, civil engineers, and builders. This document records the comprehensive technical audit of the codebase, evaluating backend microservices, data persistence, frontend components, authentication mechanics, tenant isolation, and API integrity.

---

## 2. Inventory & Architecture Overview

### 2.1 Backend (`/backend`)
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js 4.19.2
- **Database:** MongoDB via Mongoose 8.3.1
- **Authentication:** JWT (JSON Web Tokens) with `bcryptjs` password hashing
- **Entry Points:** `server.js` -> `src/app.js`
- **Domain Models:**
  - `User`: User accounts, hashed credentials, roles (`owner`, `manager`, `accountant`), company association (`companyId`), account status.
  - `Company`: Tenant profile, subscription plan tier (`free`, `pro`, `enterprise`).
  - `Project`: Project scopes, budget, spent counters, milestone progress, dates, company ownership.
  - `Worker`: Worker profiles, trade roles, daily wage, project linkage.
  - `Attendance`: Worker check-ins per project per date with compound uniqueness constraints.
  - `Material`: Inventory items per project, stock counters (`totalIn`, `totalUsed`, `remaining`).
  - `MaterialLog`: Immutable audit trail for material receipts (`IN`) and dispatches (`OUT`).
  - `Expense`: Categorized expenditure ledger linked to projects and logged by authenticated users.
  - `DailyReport`: Structured site reports, keyword-driven AI progress/delay risk assessments.
  - `Alert`: Operational alerts categorized by severity (`low`, `medium`, `high`) and domain (`budget`, `delay`, `material`, `worker`).

### 2.2 Frontend (`/frontend`)
- **Runtime/Bundler:** Vite 5.2.10
- **Framework:** React 18.3.1 with React Router DOM 6.23.0
- **Visuals & Charts:** Lucide-React icons, Chart.js, Recharts
- **API Service Layer:** Axios (`src/services/api.js`) with bearer token injection and 401 interception.
- **Pages:**
  - `Login.jsx` & `Register.jsx`: Authentication flows.
  - `Dashboard.jsx`: Executive summary, KPIs, progress charts, attendance widgets, and operational activity feeds.
  - `Projects.jsx`: Project listing, quick stats, new project creation modal.
  - `ProjectDetail.jsx`: Tabbed workspace for managing Project Overview, Daily Site Logs, Workforce & Attendance, Materials & Inventory, and Financial Expenses.

---

## 3. Discovered Defects & Verification Log

### Issue Audit Table

| Issue ID | File / Endpoint | Observed Behavior | Severity | Business Impact | Proposed Fix / Resolution | Status |
|---|---|---|---|---|---|---|
| **SEC-01** | `auth.middleware.js` & `auth.controller.js` | Hardcoded fallback JWT secret (`'constructops_jwt_secret_key_2024'`) allowed token forgery if env unset. | **P0** | Total platform compromise. | Enforce mandatory `process.env.JWT_SECRET` at server start; eliminate fallback strings. | **FIXED** |
| **SEC-02** | `auth.controller.js` | Weak password registration allowed arbitrary short passwords without complexity constraints. | **P0** | Credential stuffing and account takeover risks. | Regex enforced for minimum 8 characters with letter and number requirements. | **FIXED** |
| **TEN-01** | `expense.controller.js` | Missing `companyId` verification on project lookups in expense CRUD. | **P0** | Cross-tenant financial tampering and data leakage. | Enforced parent project company ownership validation on all expense endpoints. | **FIXED** |
| **TEN-02** | `worker.controller.js` | `projectId` query was executed without tenant verification in worker and attendance controllers. | **P0** | Tenant A could view and modify Tenant B's laborers and payroll logs. | Added tenant ownership verification before worker profile and attendance mutations. | **FIXED** |
| **TEN-03** | `material.controller.js` | Material records and logs did not verify project company boundary. | **P0** | Cross-tenant inventory theft and tampering. | Validated project ownership on materials creation, listing, and transaction logging. | **FIXED** |
| **TEN-04** | `report.controller.js` | Daily reports could be submitted or deleted across projects without verifying tenant company. | **P0** | Infiltration of fake site logs and deletion of audit trails across companies. | Enforced parent project ownership check on report operations. | **FIXED** |
| **TEN-05** | `alert.controller.js` | Alerts could be marked read across tenants using guessed IDs. | **P1** | Suppression of critical alerts between competitors. | Added company-level authorization guard on `markAlertRead`. | **FIXED** |
| **TEN-06** | `dashboard.routes.js` | Today's worker attendance query did not filter by company projects. | **P1** | Global attendance counts leaked to tenant dashboards. | Scoped attendance records strictly to company-owned project IDs. | **FIXED** |
| **OPS-01** | Frontend root `package.json` | Missing `node_modules` in fresh environments resulted in build failures (`vite` missing). | **P1** | Build failure in CI/CD pipeline. | Resolved via lockfile installation (`npm ci`); production build verified. | **FIXED** |
| **DAT-01** | Financial Ledger & Reconciliations | `spent` counter in Project was updated via unindexed iterative lookups without atomicity guarantees. | **P1** | Inconsistent ledger balances during high concurrent site submissions. | Plan atomic aggregations or mongoose transactions for financial entries. | **IN PROGRESS** |

---

## 4. Current Baseline Verification Results
- **Backend Syntax & Module Resolution:** Verified via isolated ES execution (`Syntax & imports OK`).
- **Frontend Production Bundle:** Tested with `vite build`. Successfully generated:
  - `dist/index.html` (1.10 kB)
  - `dist/assets/index-*.css` (5.35 kB)
  - `dist/assets/index-*.js` (304.18 kB)
- **Multi-Tenant Protection:** Completed across all 5 core controllers (`project`, `expense`, `worker`, `material`, `report`, `alert`).

---

## 5. Next Immediate Phase Deliverables
1. Establish automated test suite in backend using Jest & Supertest.
2. Formalize Joi/Zod request validation on all incoming API payloads.
3. Complete full documentation set in `/docs/`.
