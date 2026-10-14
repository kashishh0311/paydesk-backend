const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  deleteEmployee
} = require('../controllers/employeeController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/', getEmployees);
router.post('/', createEmployee);
router.get('/:id', getEmployeeById);
router.delete('/:id', deleteEmployee);

module.exports = router;
