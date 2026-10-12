# Roadmap: ConstructOps

## Overview
This roadmap covers the end-to-end development of the ConstructOps SaaS platform. Sliced into 4 sequential phases, we go from core authentication and project scaffolding to a fully styled dashboards, budget reporting, material tracking, and daily reports integrated with voice inputs and AI analysis.

## Phases

- [ ] **Phase 1: Foundation** - Setup monorepo, Auth system, project endpoints, database architecture, and initial project dashboard frontend views.
- [ ] **Phase 2: Budgeting & Expenses** - Add Expense logging, budget allocation, dashboard charts (budget vs actual, over time), and Role-Based Access Control (RBAC).
- [ ] **Phase 3: Worker & Material Logistics** - Implement Worker attendance registry, salary reports, and Material stock tracking with IN/OUT logs.
- [ ] **Phase 4: Site Reports, AI Vision, and Voice** - Implement daily photo log upload, AI progress & delay prediction placeholder, voice Urdu translation input, and mobile responsiveness.

## Phase Details

### Phase 1: Foundation
**Goal**: Build database structure, user registration/login, project creation APIs, and the foundational layout/navigation of the frontend.
**Depends on**: Nothing
**Requirements**: AUTH-01, AUTH-02, AUTH-04, PROJ-01, PROJ-02, PROJ-03
**Success Criteria**:
  1. A user can register as an Owner/Manager and log in securely.
  2. The app stores login state and persists session on reload.
  3. The Owner can create new construction projects and view them in a responsive list.
  4. The frontend renders a clean layout with sidebar navigation.
**Plans**: 3 plans

Plans:
- [ ] 01-01: Backend setup (Node/Express, MongoDB schemas, JWT Authentication, project router).
- [ ] 01-02: Frontend project init (React/Vite with premium CSS styling tokens and base layout).
- [ ] 01-03: Connect Auth and Project views (Register/Login pages, Project listing, and Project detail tabs framework).

### Phase 2: Budgeting & Expenses
**Goal**: Add expense registration, category limits, dashboard charts, and enforce Role-Based Access Controls.
**Depends on**: Phase 1
**Requirements**: AUTH-03, DASH-01, DASH-02, DASH-03, DASH-04, EXPS-01, EXPS-02
**Success Criteria**:
  1. User can add and review project expenses split by Labor, Material, Transport, and Misc.
  2. Dashboard displays total budget vs spent visual progress bar.
  3. Accountant role can ONLY view and log expenses, while Site Manager cannot edit expenses.
  4. Dashboard displays dynamic line graph showing expense trends.
**Plans**: 2 plans

Plans:
- [ ] 02-01: Backend Expense routing & dashboard aggregator endpoint.
- [ ] 02-02: Frontend Dashboard widgets and Expense ledger interfaces with role-based restriction layers.

### Phase 3: Worker & Material Logistics
**Goal**: Build worker attendance check-in systems and a secure material stock ledger with audit logs.
**Depends on**: Phase 2
**Requirements**: WORK-01, WORK-02, WORK-03, MATR-01, MATR-02, MATR-03
**Success Criteria**:
  1. User can list workers, add new workers, and click "Check-In" to mark attendance for the day.
  2. Salary summaries are calculated automatically based on daily wage and days present.
  3. User can log Material logs (Cement, Steel, Bricks) as either incoming (IN) or used (OUT).
  4. Material screen displays remaining stock and warns if usage is suspiciously high.
**Plans**: 2 plans

Plans:
- [ ] 03-01: Backend Worker/Attendance and Material/Logs endpoints.
- [ ] 03-02: Frontend Worker attendance table and Material logs dashboard.

### Phase 4: Site Reports, AI Vision, and Voice
**Goal**: Deploy daily photo updates, AI site analysis mockups, Urdu transcription voice updates, and complete design polish.
**Depends on**: Phase 3
**Requirements**: REPT-01, REPT-02, REPT-03
**Success Criteria**:
  1. Site Manager can upload daily logs with description and site photos.
  2. System returns automated AI analysis indicating progress speed or delay risk.
  3. Site Manager can tap a microphone to input romanized Urdu voice notes which parse into written daily descriptions.
  4. Full UI looks premium, polished, responsive, and matches the Orange (#FF6B00) and Graphite (#1E1E1E) style guide.
**Plans**: 2 plans

Plans:
- [ ] 04-01: Daily Report API with file uploads, AI engine mock integration, and voice/audio analysis handler.
- [ ] 04-02: Frontend Report logs feed, UI polish, voice record button, and responsiveness audit.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Not started | - |
| 2. Budgeting & Expenses | 0/2 | Not started | - |
| 3. Worker & Material Logistics | 0/2 | Not started | - |
| 4. Site Reports, AI Vision, and Voice | 0/2 | Not started | - |
