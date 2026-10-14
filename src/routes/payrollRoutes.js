const express = require('express');
const router = express.Router();
const {
  getPayrollRecords,
  getPayrollSummary,
  calculatePayroll,
  approvePayroll,
  recordPayment,
  getDeductions,
  getDeductionDetails,
  getPayslipDetails,
  getEmployeeHistory,
  getPayslipHtml,
  downloadPayslip
} = require('../controllers/payrollController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);

// HR Only access to payroll management operations
router.get('/records', getPayrollRecords);
router.get('/summary', getPayrollSummary);
router.get('/deductions', getDeductions);
router.get('/deductions/:id', getDeductionDetails);
router.get('/history/:employee_id', getEmployeeHistory);
router.get('/payslip/:id', getPayslipDetails);
router.get('/payslip/:id/html', getPayslipHtml);
router.get('/payslip/:id/download', downloadPayslip);

router.post('/calculate', authorize('HR_MANAGER'), calculatePayroll);
router.post('/approve', authorize('HR_MANAGER'), approvePayroll);
router.post('/payment', authorize('HR_MANAGER'), recordPayment);

module.exports = router;
