const employeeService = require('../services/employeeService');

/**
 * GET /api/v1/employees
 * Paginated list of employees with search and filters
 */
const getEmployees = async (req, res) => {
  try {
    const { page, limit, search, department, country } = req.query;
    const result = await employeeService.listEmployees({ page, limit, search, department, country });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('getEmployees error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve employee records'
    });
  }
};

/**
 * GET /api/v1/employees/:id
 * Get single employee with salary records and audit logs
 */
const getEmployeeById = async (req, res) => {
  try {
    const employee = await employeeService.getEmployeeById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('getEmployeeById error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve employee details'
    });
  }
};

/**
 * POST /api/v1/employees
 * Create new employee with starting salary and compliance audit log
 */
const createEmployee = async (req, res) => {
  try {
    const newEmployee = await employeeService.createEmployee(req.body, req.user?.id || null);

    return res.status(201).json({
      success: true,
      message: `Employee ${newEmployee.employee_code} onboarded successfully`,
      data: newEmployee
    });
  } catch (error) {
    console.error('createEmployee error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create employee record'
    });
  }
};

/**
 * DELETE /api/v1/employees/:id
 * Delete employee and record in audit trail
 */
const deleteEmployee = async (req, res) => {
  try {
    const removedEmployee = await employeeService.deleteEmployee(
      req.params.id,
      req.user?.id || null,
      req.body?.reason || 'HR Manager requested record removal'
    );

    return res.status(200).json({
      success: true,
      message: `Employee ${removedEmployee.employee_code} removed successfully`
    });
  } catch (error) {
    console.error('deleteEmployee error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to delete employee'
    });
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  deleteEmployee
};
