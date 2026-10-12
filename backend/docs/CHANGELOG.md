# CHANGELOG — CONSTRUCTOPS
All notable changes to the ConstructOps platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
