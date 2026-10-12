# ConstructOps

## What This Is

ConstructOps is a Construction Project Management SaaS system designed for builders, site managers, and accountants. It streamlines site operations by tracking attendance, material logistics, expenses, and daily site reports, with integrated AI insights (progress/delay detection) and voice input capability tailored for ease of use.

## Core Value

Enable builders and developers to control their construction site operations, budgets, materials, and labor from anywhere with real-time tracking and automated risk/theft detection.

## Requirements

### Validated

*(None yet — ship to validate)*

### Active

- [ ] **AUTH-01**: Multi-role login and registration (Owner, Site Manager, Accountant)
- [ ] **DASH-01**: Central project dashboard showing budget vs spent, completion progress, and active alerts
- [ ] **PROJ-01**: Project lifecycle management (CRUD, detail views, and sub-module tabs)
- [ ] **WORK-01**: Worker management with daily attendance check-in, wages, and role tracking
- [ ] **MATR-01**: Material stock ledger with IN/OUT audit logging to prevent theft
- [ ] **EXPS-01**: Expense tracker comparing daily category expenses against budget
- [ ] **REPT-01**: Daily site report upload with image capture and AI status analysis
- [ ] **ALRT-01**: Real-time notifications and alerts for budget overrun, delays, or material mismatches
- [ ] **VOIC-01**: Voice transcription input for quick, hands-free Urdu/Roman Urdu site reporting

### Out of Scope

- [ ] **Face Recognition Attendance** — Deferred to a future milestone to keep initial labor tracking simple and lightweight.
- [ ] **Custom WhatsApp/SMS Gateway Integrations** — Deferred to v2. In-app alerts are sufficient for the MVP.
- [ ] **Automated Supplier Purchase Ordering** — Handled manually in MVP; focus is on material audits and theft logs.

## Context

- **Target Market**: Pakistan/Middle East region builders who need a mobile-first, easy-to-use site logging tool that bridges the gap between field workers and office management.
- **Environment**: Highly mobile-reliant. Field connectivity can be spotty, so site manager tools need to be straightforward, lightning-fast, and responsive on mobile browsers.

## Constraints

- **Tech Stack**: MERN (MongoDB, Express, React/Next.js, Node.js) with standard Vanilla CSS for a clean, customized, and responsive design system.
- **Database**: Single MongoDB cluster, heavily reliant on indexing project and material IDs for performant logging.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Monorepo Layout | Easy to share types, schemas, and configurations across frontend and backend. | — Pending |
| Separate Material Logs | Prevents audit tampering and provides clear historical logs for fraud detection. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? → Move to Out of Scope with reason.
2. Requirements validated? → Move to Validated with phase reference.
3. New requirements emerged? → Add to Active.
4. Decisions to log? → Add to Key Decisions.
5. "What This Is" still accurate? → Update if drifted.

**After each milestone**:
1. Full review of all sections.
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state.

---
*Last updated: 2026-05-19 after initialization*
