const express = require('express');
const router = express.Router();
const {
  getSalaries,
  reviseSalary,
  getSalaryStructure,
  getEmployeeHistory,
  getPayslipHtml,
  addPayslipDeduction,
  updatePayslipEarnings,
  removePayslipDeduction
} = require('../controllers/salaryController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', getSalaries);
router.post('/revise', reviseSalary);
router.get('/structure/:employee_id', getSalaryStructure);
router.get('/history/:employee_id', getEmployeeHistory);
router.get('/payslip/:id/html', getPayslipHtml);
router.post('/payslip/:id/deduction', addPayslipDeduction);
router.put('/payslip/:id/earnings', updatePayslipEarnings);
router.delete('/payslip/:id/deduction/:deduction_id', removePayslipDeduction);

module.exports = router;
