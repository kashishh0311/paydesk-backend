const express = require('express');
const router = express.Router();
const { getSalaries, reviseSalary, getSalaryStructure, getEmployeeHistory, getPayslipHtml } = require('../controllers/salaryController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', getSalaries);
router.post('/revise', reviseSalary);
router.get('/structure/:employee_id', getSalaryStructure);
router.get('/history/:employee_id', getEmployeeHistory);
router.get('/payslip/:id/html', getPayslipHtml);

module.exports = router;
