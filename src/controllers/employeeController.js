const employeeService = require('../services/employeeService');
const { formatUserErrorMessage } = require('../utils/errorResponse');

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
      message: formatUserErrorMessage(error, 'Unable to retrieve employee records. Please try again.')
    });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const employee = await employeeService.getEmployeeById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found.'
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
      message: formatUserErrorMessage(error, 'Unable to retrieve employee details. Please try again.')
    });
  }
};

const createEmployee = async (req, res) => {
  try {
    const newEmployee = await employeeService.createEmployee(req.body, req.user?.id || null);

    return res.status(201).json({
      success: true,
      message: `Employee ${newEmployee.employee_code} onboarded successfully.`,
      data: newEmployee
    });
  } catch (error) {
    console.error('createEmployee error:', error);
    const statusCode = error.statusCode || (error.name === 'SequelizeUniqueConstraintError' ? 409 : 400);
    return res.status(statusCode).json({
      success: false,
      message: formatUserErrorMessage(error, 'Unable to create employee record. Please verify the input values.')
    });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const updatedEmployee = await employeeService.updateEmployee(
      req.params.id,
      req.body,
      req.user?.id || null
    );

    return res.status(200).json({
      success: true,
      message: `Employee ${updatedEmployee.employee_code} updated successfully.`,
      data: updatedEmployee
    });
  } catch (error) {
    console.error('updateEmployee error:', error);
    const statusCode = error.statusCode || (error.name === 'SequelizeUniqueConstraintError' ? 409 : 400);
    return res.status(statusCode).json({
      success: false,
      message: formatUserErrorMessage(error, 'Unable to update employee record. Please verify the input values.')
    });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const removedEmployee = await employeeService.deleteEmployee(
      req.params.id,
      req.user?.id || null,
      req.body?.reason || 'HR Manager requested record removal'
    );

    return res.status(200).json({
      success: true,
      message: `Employee ${removedEmployee.employee_code} removed successfully.`
    });
  } catch (error) {
    console.error('deleteEmployee error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: formatUserErrorMessage(error, 'Unable to delete employee record. Please try again.')
    });
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
};
