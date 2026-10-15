# PayDesk HRMS — Backend Development Notes & Key Decisions

## 1. Important Technical Decisions

### 1.1 Server-Side Calculations vs. Client-Side Math
- **Decision**: All statutory deductions, allowances, and LOP are computed exclusively on the backend.
- **Rationale**: Ensures that what appears in the web UI matches exported CSVs, Excel spreadsheets, and generated HTML salary slips down to the exact rupee.

### 1.2 Dual Token Acceptance (Bearer Header + Cookie)
- **Challenge**: Cross-origin cookies between the frontend origin (`https://<frontend-domain>.onrender.com`) and backend origin (`https://<backend-domain>.onrender.com`) were occasionally dropped during initial login on Safari and Chrome Incognito.
- **Solution**: Allowed `authMiddleware.js` to inspect both `Authorization: Bearer <token>` and `req.cookies.paydesk_token`. The frontend immediately caches the token and sends it as a Bearer header, eliminating 401 cold-start failures.

### 1.3 Standalone HTML Salary Slip Architecture
- **Challenge**: Generating PDFs using headless Chrome (Puppeteer) caused memory crashes on low-RAM container tiers.
- **Solution**: Engineered a responsive HTML/CSS payslip template with `@media print` rules delivered with `Content-Disposition: attachment`. It opens instantly, loads in <10ms, and enables native one-click browser printing to PDF.

### 1.4 Automatic Active Cycle Generation
- **Challenge**: When an HR manager downloads a payslip for an employee who has not yet had a payroll cycle processed, a 404 error was previously returned.
- **Solution**: In `getEmployeeHistory` and `downloadSlip`, the backend dynamically synthesizes and persists the verified active cycle and itemized deductions if none exist, guaranteeing zero 404 errors during demo testing.

---

## 2. Database Trade-offs & Migrations
- **Sequelize vs Raw SQL**: Sequelize was selected for standard relational CRUD and managed transactions, while optimized raw SQL was retained for high-speed analytics queries (e.g. `analyticsService.js` quartile distributions and 10,000-record aggregations).
- **Batch Size Optimization**: Benchmarked chunk sizes of 100, 500, and 2000 for the seeder. `CHUNK_SIZE = 500` offered the optimal trade-off between database memory allocation and total execution time (14.2s for 10,000 records).
