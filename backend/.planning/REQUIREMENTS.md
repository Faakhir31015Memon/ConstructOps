# Requirements: ConstructOps

**Defined:** 2026-05-19
**Core Value:** Control construction site operations, budgets, materials, and labor from anywhere with real-time tracking and automated theft/mismatch detection.

## v1 Requirements

### Authentication & Authorization (AUTH)
- [ ] **AUTH-01**: User can register an account with name, email, password, role (owner, manager, accountant), and company name.
- [ ] **AUTH-02**: User can log in with email and password, receiving a JSON Web Token (JWT).
- [ ] **AUTH-03**: Backend restricts endpoints based on role (e.g., Owner has full access; Manager has Project/Reports; Accountant has Expense-only access).
- [ ] **AUTH-04**: Session persists across frontend page reloads via local storage token verification.

### Dashboard (DASH)
- [ ] **DASH-01**: User sees total active projects, total budget vs. spent, active workers, and critical alerts.
- [ ] **DASH-02**: User sees visual project completion percentage progress bars.
- [ ] **DASH-03**: Interactive line chart showing expenses over time (using Chart.js or equivalent clean canvas rendering).
- [ ] **DASH-04**: Alerts panel highlighting active mismatches, delay warnings, or overruns.

### Project Management (PROJ)
- [ ] **PROJ-01**: Owner can create a new project with location, budget, target end date, and description.
- [ ] **PROJ-02**: User can view a clean responsive list of projects.
- [ ] **PROJ-03**: User can click a project card to view details split into sub-tabs: Overview, Daily Reports, Workers, Materials, and Expenses.

### Worker & Attendance Management (WORK)
- [ ] **WORK-01**: User can add workers with name, role (mason, helper, electrician, etc.), daily wage, and phone number.
- [ ] **WORK-02**: Site Manager can mark worker attendance (present/absent) for the current date.
- [ ] **WORK-03**: System calculates weekly/monthly worker salary reports based on daily wages and checked-in days.

### Material Tracking (MATR)
- [ ] **MATR-01**: User can view material inventory status (Quantity In, Quantity Used, Remaining Stock) for Cement, Steel, Bricks, etc.
- [ ] **MATR-02**: Site Manager can log material transactions (IN = additions, OUT = usage on site) with specific quantities and audit notes.
- [ ] **MATR-03**: System triggers warning indicators if materials used exceed estimated standards (theft detection).

### Expense Management (EXPS)
- [ ] **EXPS-01**: User can log expenses with amount, date, description, and category (Labor, Material, Transport, Misc).
- [ ] **EXPS-02**: Dashboard displays budget vs actual spend comparisons with progress indicators.

### Daily Site Reports & AI Insights (REPT)
- [ ] **REPT-01**: Site Manager can write daily work logs, upload site photos, and specify work types (Foundation, Structure, Slab, Finishing).
- [ ] **REPT-02**: System automatically analyzes uploaded photos using an AI vision placeholder / API to return progress changes and delay risk alerts.
- [ ] **REPT-03**: Site Manager can input progress reports using Urdu voice transcription (converting audio to text or parsing Roman Urdu voice logs).

## v2 Requirements (Deferred)
- **AUTH-05**: OAuth integration for Google / Password recovery workflow.
- **WORK-04**: Facial recognition attendance verification on check-in.
- **ALRT-02**: WhatsApp and SMS automated notifications to owners.
- **EXPS-03**: Automated image receipt parsing and scanning.

## Out of Scope
| Feature | Reason |
|---------|--------|
| Multi-Company Collaboration | The initial scope is limited to one company per registration for simplicity. |
| Subcontractor Bid Management | High complexity, not critical to core on-site operation tracking. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01     | Phase 1 | Pending |
| AUTH-02     | Phase 1 | Pending |
| AUTH-03     | Phase 1 | Pending |
| AUTH-04     | Phase 1 | Pending |
| PROJ-01     | Phase 1 | Pending |
| PROJ-02     | Phase 1 | Pending |
| PROJ-03     | Phase 1 | Pending |
| DASH-01     | Phase 2 | Pending |
| DASH-02     | Phase 2 | Pending |
| DASH-03     | Phase 2 | Pending |
| DASH-04     | Phase 2 | Pending |
| EXPS-01     | Phase 2 | Pending |
| EXPS-02     | Phase 2 | Pending |
| WORK-01     | Phase 3 | Pending |
| WORK-02     | Phase 3 | Pending |
| WORK-03     | Phase 3 | Pending |
| MATR-01     | Phase 3 | Pending |
| MATR-02     | Phase 3 | Pending |
| MATR-03     | Phase 3 | Pending |
| REPT-01     | Phase 4 | Pending |
| REPT-02     | Phase 4 | Pending |
| REPT-03     | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-19*
*Last updated: 2026-05-19 after initial definition*
