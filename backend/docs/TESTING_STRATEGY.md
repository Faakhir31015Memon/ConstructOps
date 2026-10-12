# TESTING STRATEGY & TEST HARNESS — CONSTRUCTOPS
**Test Framework:** Jest / Supertest (Backend), Vitest / React Testing Library (Frontend)  
**Target Coverage:** Core Auth, Multi-Tenant Boundaries, Financial Ledgers, Inventory Transactions  

---

## 1. Testing Pyramid
1. **Unit Tests:**
   - Password policy validation.
   - Financial calculation & float precision guards.
   - Material inventory balance delta logic.
2. **Integration Tests (API Endpoints):**
   - Auth flow: Register -> Login -> Token generation.
   - Multi-tenant isolation: Tenant A attempting to read/modify/delete Tenant B's projects, workers, expenses, or materials (Must return 403/404).
   - RBAC verification: Site manager attempting to delete a project or access owner billing settings (Must return 403).
3. **End-to-End Tests (Critical User Journeys):**
   - Company onboarding -> Project creation -> Adding worker & logging attendance -> Logging material delivery & usage -> Adding expense -> Verifying dashboard metrics.

---

## 2. Multi-Tenant Test Matrix
| Scenario | Requesting Actor | Target Resource | Expected HTTP Status |
|---|---|---|---|
| Read Project | Tenant A (Owner) | Tenant A Project | **200 OK** |
| Read Project | Tenant B (Owner) | Tenant A Project | **404 Not Found** |
| Add Expense | Tenant B (Accountant) | Tenant A Project | **404 Not Found** |
| Log Material OUT | Tenant B (Manager) | Tenant A Material | **404 Not Found** |
| Mark Alert Read | Tenant B (Manager) | Tenant A Alert | **403 Forbidden** |
| Delete Project | Tenant A (Manager) | Tenant A Project | **403 Forbidden** (Owner only) |
