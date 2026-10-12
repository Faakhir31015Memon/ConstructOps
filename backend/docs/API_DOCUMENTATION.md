# API DOCUMENTATION & CONTRACTS — CONSTRUCTOPS
**Base Path:** `/api/v1`  
**Authentication:** Bearer Token (JWT Header: `Authorization: Bearer <TOKEN>`)  
**Standard Response Shape:**
```json
{
  "success": true,
  "data": { ... } // or entity key e.g. "projects", "expense"
}
```
**Standard Error Shape:**
```json
{
  "success": false,
  "message": "Human readable error description"
}
```

---

## 1. Authentication Endpoints (`/auth`)

### 1.1 Register Company & Owner
- **POST** `/auth/register`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@contractor.com",
    "password": "Password123",
    "companyName": "Apex Builders Ltd"
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "user": { "_id": "...", "name": "Jane Doe", "email": "jane@contractor.com", "role": "owner", "companyId": "..." },
    "token": "eyJhbGciOi..."
  }
  ```

### 1.2 User Login
- **POST** `/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "jane@contractor.com",
    "password": "Password123"
  }
  ```
- **Response (200):** Same user and JWT payload.

---

## 2. Project Management (`/projects`)

### 2.1 List Company Projects
- **GET** `/projects`
- **Access:** Private (All roles within tenant)
- **Response (200):** Array of tenant-owned projects.

### 2.2 Create Project
- **POST** `/projects`
- **Access:** Private (`owner`, `manager`)
- **Request Body:**
  ```json
  {
    "name": "Gulberg Residency Tower",
    "location": "Lahore, Block D",
    "budget": 45000000,
    "startDate": "2026-11-01",
    "endDate": "2027-12-31"
  }
  ```

### 2.3 Get Project Dashboard Analytics
- **GET** `/projects/:id/dashboard`
- **Access:** Private (Verified tenant only)
- **Response (200):** Detailed KPIs including total spent, progress, active workers, latest site reports, and expense breakdown by category.

---

## 3. Financial Ledger (`/expenses`)

### 3.1 Record Project Expense
- **POST** `/expenses`
- **Access:** Private (`owner`, `accountant`)
- **Request Body:**
  ```json
  {
    "projectId": "664b...",
    "category": "material",
    "amount": 125000,
    "description": "50 bags DG Khan cement delivery",
    "date": "2026-10-15"
  }
  ```
- **Behavior:** Validates project belongs to caller's company, records ledger entry, recalculates total project spent atomically, and fires budget overrun alerts if budget threshold exceeded.

---

## 4. Workforce & Attendance (`/workers`)

### 4.1 Register Worker
- **POST** `/workers`
- **Access:** Private (`owner`, `manager`)
- **Fields:** `projectId`, `name`, `role`, `dailyWage`, `phone`.

### 4.2 Submit Attendance Check-In
- **POST** `/workers/attendance/check-in`
- **Access:** Private (`owner`, `manager`)
- **Fields:** `workerId`, `projectId`, `date`, `status` (`present` | `absent`).

---

## 5. Inventory & Materials (`/materials`)

### 5.1 Define Material
- **POST** `/materials`
- **Access:** Private (`owner`, `manager`)
- **Fields:** `projectId`, `name`, `unit`.

### 5.2 Log Stock Movement (IN / OUT)
- **POST** `/materials/log`
- **Access:** Private (`owner`, `manager`)
- **Fields:** `projectId`, `materialId`, `type` (`IN` | `OUT`), `quantity`, `note`.
- **Auditing:** Adjusts stock levels; automatically flags high severity alerts if balance drops into negative discrepancy.
