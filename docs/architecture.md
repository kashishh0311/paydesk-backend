# PayDesk HRMS — Backend Architecture & Layered Design

## 1. Architectural Pattern: Controller-Service-Repository (CSR)
The PayDesk backend strictly enforces the **Layered Controller-Service-Repository Pattern**:
- **Routes Layer**: Maps HTTP endpoints, applies validation and authentication middlewares.
- **Controllers Layer**: Extracts request payloads, parses query parameters, invokes domain services, and formats standard JSON responses.
- **Services Layer**: Encapsulates 100% of business logic, financial formulas, ACID transactions, and external AI integrations.
- **Models / Data Layer**: Sequelize models defining MySQL tables, column types, relationships, and lifecycle hooks.

---

## 2. Directory Structure

```text
src/
├── app.js                   # Express application setup, middleware configuration
├── server.js                # Server entrypoint listening on process.env.PORT
├── config/
│   ├── database.js          # Sequelize connection settings and dialect options
│   └── dbConnection.js      # Database connectivity health checker
├── constants/               # Global enumerations (roles, statuses)
├── controllers/             # HTTP request handlers
│   ├── aiController.js
│   ├── analyticsController.js
│   ├── auditLogController.js
│   ├── authController.js
│   ├── employeeController.js
│   ├── exportController.js
│   ├── payrollController.js
│   └── salaryController.js
├── middlewares/             # Interceptors
│   ├── authMiddleware.js    # Dual-token JWT verification and role checking
│   └── validateMiddleware.js# Joi / validation handlers
├── models/                  # Sequelize ORM schema definitions
│   ├── AuditLog.js
│   ├── Employee.js
│   ├── PayrollDeduction.js
│   ├── PayrollRecord.js
│   ├── Role.js
│   ├── SalaryRecord.js
│   ├── User.js
│   └── index.js             # Model associations and relationship definitions
├── routes/                  # Express route routers
│   ├── aiRoutes.js
│   ├── analyticsRoutes.js
│   ├── auditLogRoutes.js
│   ├── authRoutes.js
│   ├── employeeRoutes.js
│   ├── exportRoutes.js
│   ├── payrollRoutes.js
│   └── salaryRoutes.js
├── services/                # Pure business logic and domain services
│   ├── analyticsService.js
│   ├── auditService.js
│   ├── authService.js
│   ├── employeeService.js
│   ├── payrollService.js
│   └── salaryService.js
├── utils/                   # Shared utility helpers
│   ├── cookie.js            # Cookie options generator
│   └── token.js             # JWT generation and verification
└── validators/              # Input schema validation rules
```

---

## 3. Request Lifecycle Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client App (React SPA)
    participant App as Express App (app.js)
    participant Auth as Auth Middleware
    participant Route as Express Router
    participant Controller as Domain Controller
    participant Service as Domain Service
    participant DB as MySQL (Sequelize ORM)
    participant AI as Gemini AI Service

    Client->>App: HTTP Request (e.g. POST /api/v1/salaries/revise)
    App->>Auth: Verify JWT Token (Bearer / Cookie)
    
    alt Token Missing or Invalid
        Auth-->>Client: 401 Unauthorized
    else Token Valid & Role = HR_MANAGER
        Auth->>Route: Forward Request
        Route->>Controller: Route to reviseSalary(req, res)
        Controller->>Service: Call salaryService.reviseSalary(payload)
        
        opt Database Transaction
            Service->>DB: Begin Managed Transaction
            Service->>DB: Update salary_records
            Service->>DB: Recalculate payroll_records & deductions
            Service->>DB: Insert into audit_logs
            Service->>DB: Commit Transaction
        end
        
        opt AI Query Request
            Service->>AI: Send Parameterized Prompt & Aggregate Context
            AI-->>Service: Generated Natural Language Analysis
        end
        
        Service-->>Controller: Return Result Object
        Controller-->>Client: 200 OK + { success: true, data: ... }
    end
```

---

## 4. Backend Component Relationship Map

```mermaid
graph TD
    App["Express App (src/app.js)"]
    
    subgraph Middlewares
        Auth["authMiddleware.js"]
        Validate["validateMiddleware.js"]
    end
    
    subgraph Routes
        R_Auth["authRoutes.js"]
        R_Emp["employeeRoutes.js"]
        R_Sal["salaryRoutes.js"]
        R_Pay["payrollRoutes.js"]
        R_Exp["exportRoutes.js"]
        R_Ana["analyticsRoutes.js"]
        R_Aud["auditLogRoutes.js"]
        R_AI["aiRoutes.js"]
    end
    
    subgraph Controllers
        C_Auth["authController.js"]
        C_Emp["employeeController.js"]
        C_Sal["salaryController.js"]
        C_Pay["payrollController.js"]
        C_Exp["exportController.js"]
        C_Ana["analyticsController.js"]
        C_Aud["auditLogController.js"]
        C_AI["aiController.js"]
    end
    
    subgraph Services
        S_Auth["authService.js"]
        S_Emp["employeeService.js"]
        S_Sal["salaryService.js"]
        S_Pay["payrollService.js"]
        S_Aud["auditService.js"]
        S_Ana["analyticsService.js"]
    end
    
    subgraph Models
        M_User["User & Role"]
        M_Emp["Employee"]
        M_Sal["SalaryRecord"]
        M_Pay["PayrollRecord"]
        M_Ded["PayrollDeduction"]
        M_Aud["AuditLog"]
    end

    App --> Auth
    Auth --> Routes
    Routes --> Controllers
    Controllers --> Services
    Services --> Models
    Models --> MySQL[(MySQL 8.0+ Database)]
```

---

## 5. Transaction & Consistency Boundaries
All state-modifying operations that touch more than one table must execute inside a Sequelize managed transaction:

```javascript
const transaction = await sequelize.transaction();
try {
  // 1. Delete dependent deductions
  // 2. Delete payroll records
  // 3. Delete salary records
  // 4. Delete audit logs
  // 5. Delete employee row
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

This prevents database corruption, orphaned records, and foreign key constraint crashes during employee deletion or compensation restructuring.

---

## 6. Engineering & Documentation Artifacts

- [ai-prompts.md](ai-prompts.md) — Prompts or instructions used with AI tools
- [requirements.md](requirements.md) — Functional specifications, statutory calculation rules, and 10k employee scope
- [database-design.md](database-design.md) — 7-table schema, foreign key relations, and indexing strategy
- [testing.md](testing.md) — 14-suite test architecture covering controllers, services, middlewares, and models
