# DATA MODEL SPECIFICATION — CONSTRUCTOPS
**Database Platform:** MongoDB  
**Driver:** Mongoose ORM  
**Version:** 1.0.0  

---

## 1. Schema Definitions & Relationships

### 1.1 Company (`Company`)
Tenant root container.
- `_id`: ObjectId (Primary Key)
- `name`: String (Required, trimmed)
- `subscriptionPlan`: Enum (`'free'`, `'pro'`, `'enterprise'`), Default: `'pro'`
- `createdAt`, `updatedAt`: Timestamps

### 1.2 User (`User`)
Authenticated tenant employee or system administrator.
- `_id`: ObjectId (Primary Key)
- `name`: String (Required, trimmed)
- `email`: String (Required, unique, trimmed, lowercase)
- `password`: String (Hashed with bcryptjs)
- `role`: Enum (`'owner'`, `'manager'`, `'accountant'`), Default: `'owner'`
- `companyId`: ObjectId (Ref: `Company`, Required, indexed)
- `status`: Enum (`'active'`, `'banned'`), Default: `'active'`

### 1.3 Project (`Project`)
Construction site or contract.
- `_id`: ObjectId (Primary Key)
- `companyId`: ObjectId (Ref: `Company`, Required, indexed)
- `name`: String (Required, trimmed)
- `location`: String (Required, trimmed)
- `budget`: Number (Required, default: 0)
- `spent`: Number (Required, default: 0)
- `startDate`: Date (Required)
- `endDate`: Date (Required)
- `status`: Enum (`'active'`, `'completed'`, `'paused'`), Default: `'active'`
- `progress`: Number (Min: 0, Max: 100, default: 0)

### 1.4 Expense (`Expense`)
Financial transaction recorded against a project.
- `_id`: ObjectId (Primary Key)
- `projectId`: ObjectId (Ref: `Project`, Required, indexed)
- `category`: Enum (`'labor'`, `'material'`, `'transport'`, `'misc'`)
- `amount`: Number (Required, positive number)
- `description`: String (Required, trimmed)
- `date`: Date (Required, default: Date.now)
- `addedBy`: ObjectId (Ref: `User`, Required)

### 1.5 Worker (`Worker`)
Site laborer profile.
- `_id`: ObjectId (Primary Key)
- `projectId`: ObjectId (Ref: `Project`, Required, indexed)
- `name`: String (Required, trimmed)
- `role`: String (Trade/Task, e.g., Mason, Carpenter, Welder)
- `dailyWage`: Number (Required, positive number)
- `phone`: String (Required)

### 1.6 Attendance (`Attendance`)
Daily worker muster record.
- `_id`: ObjectId (Primary Key)
- `workerId`: ObjectId (Ref: `Worker`, Required, indexed)
- `projectId`: ObjectId (Ref: `Project`, Required, indexed)
- `date`: Date (Normalized to 00:00:00 UTC)
- `status`: Enum (`'present'`, `'absent'`)
- `checkInTime`: Date (Default: Date.now)
- **Constraint:** Compound unique index on `{ workerId: 1, date: 1 }`.

### 1.7 Material (`Material`)
Project-specific stock inventory item.
- `_id`: ObjectId (Primary Key)
- `projectId`: ObjectId (Ref: `Project`, Required, indexed)
- `name`: String (Required, trimmed)
- `unit`: String (e.g., bags, tons, kg, pieces)
- `totalIn`: Number (Default: 0)
- `totalUsed`: Number (Default: 0)
- `remaining`: Number (Default: 0)
- **Constraint:** Compound unique index on `{ projectId: 1, name: 1 }`.

### 1.8 MaterialLog (`MaterialLog`)
Audit log of stock receipts and site usage.
- `_id`: ObjectId (Primary Key)
- `projectId`: ObjectId (Ref: `Project`, Required, indexed)
- `materialId`: ObjectId (Ref: `Material`, Required, indexed)
- `type`: Enum (`'IN'`, `'OUT'`)
- `quantity`: Number (Required)
- `date`: Date (Default: Date.now)
- `note`: String
- `createdBy`: ObjectId (Ref: `User`, Required)

### 1.9 DailyReport (`DailyReport`)
Daily site progress log.
- `_id`: ObjectId (Primary Key)
- `projectId`: ObjectId (Ref: `Project`, Required, indexed)
- `addedBy`: ObjectId (Ref: `User`, Required)
- `date`: Date (Default: Date.now)
- `description`: String (Required)
- `workType`: String (Default: 'Other')
- `images`: Array of Strings (Image URLs)
- `aiAnalysis`:
  - `progressDetected`: Boolean
  - `delayRisk`: Boolean
  - `notes`: String

### 1.10 Alert (`Alert`)
Operational warning or notification.
- `_id`: ObjectId (Primary Key)
- `projectId`: ObjectId (Ref: `Project`, Required, indexed)
- `type`: Enum (`'budget'`, `'delay'`, `'material'`, `'worker'`)
- `message`: String (Required)
- `severity`: Enum (`'low'`, `'medium'`, `'high'`)
- `isRead`: Boolean (Default: false)
