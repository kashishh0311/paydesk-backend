# PayDesk HRMS — Prompts or instructions used with AI tools

This document tracks the prompts I used while developing the PayDesk backend, the issues and bugs I caught, and how we fixed them.

---

## 1. Initial Requirements & Project Scoping

### My Prompt
```text
project requirement:
Goal: Build an employee salary management software for an organization with 10,000 employees.
User Persona: HR Manager of the organization.
Problem Statement: Currently, the HR team manages salary data for 10,000 employees across multiple countries using Excel spreadsheets, which is tedious, error-prone, and lacks visibility. We need a web-based system where the HR manager can manage salary data, process increments, handle deductions, generate payslips, and answer questions about how the organization pays people.
```

### What I Caught and Fixed
- Defined clear boundaries: this portal is built strictly for the HR Manager to manage payroll and answer organizational compensation questions, not for regular employees.
- Documented what to build and what to deliberately exclude (such as public employee signup or complex biometric hardware integrations) to focus on salary calculation accuracy and performance at 10,000-employee scale.

### What We Did
- Created the initial specification document ([requirements.md]) detailing the HR manager persona, functional requirements, statutory payroll calculation rules, and database schema plan.

---

## 2. HR Authentication & Login System

### My Prompt
```text
Implement authentication for the HR portal.
Use JWT tokens and cookie-parser to handle sessions securely.
This portal is strictly for HR managers to manage payroll, so regular employee login is not needed.
Hash passwords with bcrypt and protect private routes with auth middleware.
If credentials are invalid or fields are blank, return clear, user-friendly error messages instead of developer errors.
Seed a default HR account ([EMAIL_ADDRESS]) for immediate testing.
```

### What I Caught and Fixed
- Clarified that this system is only for the HR Manager, not regular employees.
- Empty fields and invalid credentials must return clear user-friendly messages like "Email and password are required" and "Invalid email or password".
- Passwords must be hashed using bcrypt, never stored in plain text.
- Protected all salary and employee routes using JWT verification and auth middleware.
- Seeded a default HR manager account ([EMAIL_ADDRESS]) so the system can be tested immediately.

### What We Did
- Created [authController.js], [authService.js], and [authRoutes.js].
- Built routes for login (`POST /api/v1/auth/login`), logout (`POST /api/v1/auth/logout`), and profile check (`GET /api/v1/auth/me`).
- Added [authMiddleware.js] to verify JWT tokens from both cookies and `Authorization: Bearer <token>` headers.
- Created User and Role models with bcrypt password hashing in hooks.

---

## 3. Salary System & 10,000 Employees Seeder

### My Prompt
```text
Build employee salary management software for an organization with 10,000 employees.
The organization is moving away from Excel spreadsheets, so we need a database-backed solution.
Include an employee directory, salary calculation engine for Indian statutory pay, increments, payslips, and audit logging.
Create a fast database seeder script to populate 10,000 realistic employee records without timing out.
```

### What I Caught and Fixed
- The seed script timed out when trying to insert 10,000 records all at once.
- Deleting an employee caused foreign key errors because audit logs and deduction rows were still linked.

### What We Did
- Wrote salary calculation functions in [salaryService.js] for basic pay, allowances (HRA, special allowance), statutory deductions (EPF, professional tax, health insurance), and unpaid leave loss of pay.
- Changed `seedEmployees.js` to insert in batches of 500 records inside transactions. It now seeds all 10,000 employees in under 18 seconds.
- Fixed employee deletion by deleting deductions, payroll, salary records, and audit logs first inside a transaction.

---

## 4. Supporting Dual-Token Authentication

### My Prompt
```text
When testing the application, refreshing the page sometimes drops the session and redirects to login with a 401 error.
Update the authentication middleware to support dual-token verification: accept the JWT from the Authorization Bearer header as well as cookies, so the session stays active reliably across domains.
```

### What Was the Issue
- Cross-origin cookies were not always sent reliably by browsers on separate deployment domains.
- Requests without cookies failed the JWT verification middleware.

### What We Did
- Updated [authMiddleware.js] to accept tokens from both `Authorization: Bearer <token>` headers and cookies.
- Returned the JWT token directly in the login response body so clients can persist it.

---

## 5. Adding Controller Unit Tests & Cleaning Up Code

### My Prompt
```text
The backend controllers currently lack dedicated unit tests.
Add test suites for employeeController, salaryController, authController, and analyticsController using Jest.
Also clean up unnecessary inline comments and keep the controller logic clean and readable.
```

### What I Wanted
- Controllers had no unit tests.
- Code had too many unnecessary inline comments.

### What We Did
- Added unit test suites for all 4 controllers ([employeeController.test.js], [salaryController.test.js], [authController.test.js], [analyticsController.test.js]).
- Cleaned up [employeeController.js] and [salaryController.js] by removing cluttered inline comments and keeping the logic simple and readable.

---

## 6. Making Database Error Messages User-Friendly

### My Prompt
```text
When a database error occurs (such as duplicate entries or foreign key conflicts), the API should not expose raw SQL errors, table names, or technical stack traces.
Implement an error response utility that converts database errors into clean, friendly messages for the user.
```

### What I Wanted
- Users should not see raw database errors, table names, or SQL messages when something fails.

### What We Did
- Created [errorResponse.js] to intercept Sequelize and database errors.
- Replaced raw errors with simple, clear messages:
  - Duplicate record -> *"A record with this information already exists. Please check your input."*
  - Foreign key issue -> *"This action cannot be completed because related records depend on it."*
  - Connection issue -> *"Database service is temporarily unavailable. Please try again in a few moments."*
  - Other database errors -> *"An unexpected database error occurred. Please try again or contact support."*
- Updated all controllers to use this helper.

---

## 7. Salary Management & Revision APIs

### My Prompt
```text
Build RESTful APIs for salary management:
1. Update employee base salary and structure with immediate recalculation of allowances and statutory deductions.
2. Implement an increments and bonus planner that supports both one-time monthly payouts and permanent annual revisions.
3. Handle unpaid leave loss of pay (LOP) deductions without modifying base salary records.
4. Generate instant printable salary slips and export payroll data.
Ensure all salary updates log an entry in the audit trail.
```

### What I Caught and Fixed
- One-time monthly performance bonuses were accidentally inflating permanent annual base salary. Separated monthly bonus additions from annual increments.
- Loss of pay deductions needed to calculate dynamically based on unpaid days rather than permanently altering compensation structures.
- Added audit trail logging inside database transactions whenever compensation is revised.

### What We Did
- Built endpoints in [salaryController.js] and [salaryRoutes.js] (`PUT /api/v1/salaries/:id`, `POST /api/v1/salaries/increment`, `GET /api/v1/salaries/slips/:id`).
- Implemented audit logging via `auditLogService.js` to track previous vs updated compensation.
- Added validation to prevent duplicate bonus submissions for the same employee in the same payroll period.

---

## 8. Dashboard Analytics & Payroll Reporting APIs

### My Prompt
```text
Create backend analytics endpoints to power the HR manager dashboard:
1. Aggregated metrics: total active workforce, monthly payroll expenditure, average CTC, and compliance health.
2. Department-wise compensation breakdown with employee counts and average pay.
3. Historical monthly payroll expense timeline data for trend charts.
Execute calculations directly in the database using SQL aggregations for optimal performance across 10,000 employees.
```

### What I Caught and Fixed
- In-memory calculation over 10,000 employee records was slow. Replaced in-memory loops with optimized MySQL `SUM`, `AVG`, `COUNT`, and `GROUP BY` database queries.
- Ensured inactive and on-leave employees are correctly factored into active headcount and budget calculations.

### What We Did
- Created [analyticsController.js], [analyticsService.js], and [analyticsRoutes.js].
- Built `GET /api/v1/analytics/overview` returning real-time metrics, department distributions, and monthly payroll expenditure curves in under 40ms.

---

## 9. AI Integration & Natural Language Query API

### My Prompt
```text
Build an AI assistant API for HR managers to answer questions about organizational compensation in plain English:
1. Integrate Groq to understand natural language questions and generate SQL queries.
2. Strictly enforce read-only execution: allow only SELECT statements and block any data modification.
3. Execute the validated query on the database and format the response in clean, conversational English.
4. Remove any hardcoded responses and ensure internal developer or database leakage is sanitized.
```

### What I Caught and Fixed
- Prevented prompt injection and database modification by enforcing strict AST and regex validation (`isReadOnlySelect`) so only safe SELECT queries can run.
- Cleaned up AI output using `cleanUserFacingText` to remove technical developer phrases and internal table references.
- Added a reliable fallback handler when LLM API keys are missing or offline so the HR chat never crashes.

### What We Did
- Created [aiController.js] and [aiRoutes.js] exposing `POST /api/v1/ai/chat`.
- Implemented schema-aware prompt engineering providing table schemas (`employees`, `salary_records`, `payroll_records`, `payroll_deductions`) to the model.
- Added live database execution of LLM-generated read-only SQL with user-facing conversational formatting.

---

## 10. Full Backend Test Coverage (Jest)

### My Prompt
```text
Set up comprehensive unit and integration test coverage for the backend across all layers:
controllers, services, routes, middleware, models, and utilities.
Make sure all test suites pass cleanly with npm test.
```

### What I Caught and Fixed
- Edge cases in salary calculations (loss of pay deductions, bonus additions, and zero-day leave) needed dedicated test assertions.
- Verified that all controller error handlers properly return formatted JSON error responses instead of unhandled exceptions.

### What We Did
- Created 14 test suites with 50 passing tests in Jest:
  - Controllers: [employeeController.test.js], [salaryController.test.js], [authController.test.js], and [analyticsController.test.js].
  - Services: salary calculations, audit logs, and employee filtering.
  - Middlewares: auth verification, role check, validation, and error handler.
  - Utilities: error response formatting, token generation, and cookies.
- Verified 100% pass rate (50 / 50 passing tests) across all test suites.

---

## Summary of Fixes

| Area | What Was the Problem | How We Fixed It | Result |
| :--- | :--- | :--- | :--- |
| **Requirements & Scoping** | Org managed 10k employees in Excel without audit trails | Analyzed requirements and wrote comprehensive specification before coding | Clear scope and architecture |
| **Authentication & Login** | Needed login for HR with clean error messages | Implemented JWT auth, bcrypt hashing, cookie-parser, and auth routes | Working secure auth APIs |
| **Session Drops** | Session dropped on refresh across different domains | Supported Bearer token header in auth middleware alongside cookies | Reliable persistent auth |
| **Seeding** | 10k employee seed script timed out | Inserted in transaction batches of 500 | Seeded in under 18s |
| **Cascade Deletion** | Deleting employee failed due to foreign key constraints | Deleted child records inside a transaction first | Clean employee removal |
| **Controller Tests** | Backend controllers had no unit tests | Wrote unit test suites for all 4 controllers | Complete controller coverage |
| **Error Handling**| Raw database and SQL errors shown to users | Added `errorResponse.js` to return clean messages | No SQL or internal errors exposed |
| **Salary Management** | One-time bonus was altering permanent base salary | Separated one-time bonuses from annual increments with audit logs | Accurate compensation tracking |
| **Dashboard Analytics** | Aggregating 10k records in memory caused slow response | Used optimized MySQL aggregate queries | Analytics delivered in <40ms |
| **AI Integration** | Needed natural language query engine without SQL injection risks | Implemented Groq LLM with strict read-only query validator | Safe live database queries |
| **Test Coverage** | Backend needed complete test suites across all layers | Created 14 Jest test suites with 50 tests | 50 / 50 tests passing (100%) |
