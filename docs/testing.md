# PayDesk HRMS — Backend Testing Strategy & Test Suites

## 1. Testing Framework: Jest & Supertest
The backend utilizes **Jest** as the primary test runner, test spy, and assertion library, with **Supertest** for HTTP API integration and route-level validation.

---

## 2. Test Architecture & Directory Structure

All test files reside inside `__tests__/` subdirectories adjacent to the target modules they verify:

```text
src/
├── controllers/
│   └── __tests__/
│       ├── employeeController.test.js   # Employee pagination, search, validation, and cascading deletion
│       ├── salaryController.test.js     # Salary directory, role authorization (403), revision, and HTML slips
│       ├── authController.test.js       # Login with cookies, client errors, session retrieval, and logout
│       └── analyticsController.test.js  # KPI aggregation, monthly trend metrics, and database error handling
├── middlewares/
│   └── __tests__/
│       └── authMiddleware.test.js       # Dual-token auth (Bearer/cookie) and role-based access control
├── models/
│   └── __tests__/
│       └── models.test.js               # Sequelize schema definitions and relational associations
├── routes/
│   └── __tests__/
│       ├── authValidation.test.js       # Email and password input validation constraints
│       └── health.test.js               # API uptime and system health status verification
├── services/
│   └── __tests__/
│       ├── salaryCalculation.test.js    # Deterministic statutory math and Loss of Pay (LOP) unit tests
│       ├── employeeService.test.js      # 10,000 employee queries, filters, and transactional deletion
│       └── authService.test.js          # Credential verification, password hashing, and token issuance
└── utils/
    └── __tests__/
        ├── errorResponse.test.js        # Sanitization of database/SQL errors into user-friendly messages
        ├── cookie.test.js               # HTTP-only cookie security flags and expiration options
        └── token.test.js                # JWT signing, expiration, and payload extraction
```

---

## 3. Test Suites Overview

### 3.1 Controller Unit Tests (`src/controllers/__tests__/`)
Controller tests mock underlying services to test HTTP responses, status codes, query handling, and user error messaging in isolation:
- **`employeeController.test.js`**:
  - Validates `GET /api/v1/employees` pagination format (`success: true`, `data`, `pagination`).
  - Ensures `GET /api/v1/employees/:id` returns HTTP 404 with a friendly error when an employee is not found.
  - Verifies `POST /api/v1/employees` returns HTTP 201 with clean creation confirmation.
  - Verifies `DELETE /api/v1/employees/:id` returns HTTP 200 and triggers cascading deletion of related payroll records.
- **`salaryController.test.js`**:
  - Validates `GET /api/v1/salaries` returns paginated salary profiles.
  - Enforces role-based authorization, ensuring unauthorized roles receive HTTP 403.
  - Validates `POST /api/v1/salaries/:employeeId/revise` accepts annual and monthly revision types.
  - Tests `GET /api/v1/salaries/slips/:slipId/download` HTML payslip generation with correct content types.
- **`authController.test.js`**:
  - Verifies successful login returns HTTP 200, JWT token, and sets the `httpOnly` secure cookie.
  - Verifies invalid credentials return HTTP 401 with a clean user-facing error message.
  - Tests logout clears cookies and returns a friendly sign-out confirmation.
- **`analyticsController.test.js`**:
  - Verifies KPI overview aggregation (total employees, active payroll spend, average CTC).
  - Verifies monthly spend breakdown arrays for progression charts.
  - Validates graceful 500 fallback handling when analytics aggregation fails.

### 3.2 User-Friendly Error Sanitization Tests (`src/utils/__tests__/errorResponse.test.js`)
To prevent database leakage, raw SQL statements, or coder jargon from exposing system internals to users:
- **Unique Constraint Errors**: Transforms `SequelizeUniqueConstraintError` (e.g. duplicate email) into `"A record with this information already exists. Please check your input."`.
- **Foreign Key Constraint Errors**: Transforms `SequelizeForeignKeyConstraintError` into `"This action cannot be completed because related records depend on it."`.
- **Database Connection Failures**: Transforms `SequelizeConnectionError` into `"Database service is temporarily unavailable. Please try again in a few moments."`.
- **Generic Database Exceptions**: Transforms `SequelizeDatabaseError` into `"An unexpected database error occurred. Please try again or contact support."`.
- **Standard HTTP Helper**: Provides `sendUserError(res, statusCode, message, error)` to guarantee consistent JSON response format across all controllers.

### 3.3 Statutory Salary Calculation Engine (`salaryCalculation.test.js`)
- **Allowance Formulas**: Verifies basic (Annual/12), HRA (40%), and Special Allowance (20%).
- **Statutory Deductions**: Verifies EPF (12%), Professional Tax (₹200), and Health Insurance (₹120).
- **Loss of Pay (LOP)**: Tests per-day rate calculation (`Basic / 30`) across varying unpaid leave days.
- **One-Time Monthly Increments**: Validates that adding a monthly bonus increases gross and net earnings without altering the base salary or statutory deduction baseline.

### 3.4 Service Layer Tests (`employeeService.test.js` & `authService.test.js`)
- **Employee Service**: Validates 10,000-record query performance, international country/currency filters, and foreign-key safe transactional cascading deletion.
- **Auth Service**: Validates bcrypt password hashing, token payload generation, and credentials validation.

### 3.5 Security, Authentication & Middlewares (`authMiddleware.test.js`, `token.test.js`, `cookie.test.js`)
- Validates dual-token retrieval (checks `Authorization: Bearer <token>` header first, falls back to `req.cookies.token`).
- Validates role-based route guards (`restrictTo('admin', 'hr_manager')`).
- Tests JWT signing, expiration, and payload extraction.
- Verifies cookie security flags (`httpOnly: true`, `sameSite: 'lax'`, `secure` in production).

### 3.6 Route Validation & Health (`authValidation.test.js` & `health.test.js`)
- Validates malformed email formats and short passwords.
- Ensures `/api/v1/health` responds with HTTP 200 and valid process uptime.

---

## 4. Code Structure & Comment Hygiene Standards

To maintain clean, professional, and maintainable production code:
1. **No Comment Bloat**: Code is self-documenting. Redundant obvious comments (e.g. `// return response`) are omitted.
2. **Standardized Controller Pattern**: Every controller method follows a predictable lifecycle:
   - Extract parameters / query / body.
   - Execute service logic.
   - Return formatted success payload (`status: 'success'` or `success: true`).
   - Catch errors and format through `formatUserError` to ensure zero internal leak.
3. **User-Centric Messaging**: Success and error messages are written from the perspective of an HR Manager, avoiding technical jargon.

---

## 5. Running Backend Tests

```bash
# Execute full 14-suite test run
npm test

# Run tests with code coverage analysis
npx jest --coverage

# Run tests in continuous watch mode
npm run test:watch
```

