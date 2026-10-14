const salaryService = require('../services/salaryService');

getSalaries = async (req, res) => {
  try {
    const { page, limit, search, department, record_type } = req.query;
    const result = await salaryService.listSalaries({ page, limit, search, department, record_type });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('getSalaries error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve salary records'
    });
  }
};

const reviseSalary = async (req, res) => {
  try {
    const roleName = (req.user?.role?.name || '').toLowerCase();
    if (roleName.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Administrator access is disabled. Only HR role is authorized.'
      });
    }

    const newRecord = await salaryService.reviseSalary(req.body, req.user?.id || null);

    return res.status(200).json({
      success: true,
      message: 'Salary revised and audit record created successfully',
      data: newRecord
    });
  } catch (error) {
    console.error('reviseSalary error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to revise salary'
    });
  }
};

const payrollService = require('../services/payrollService');

const getEmployeeHistory = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const result = await payrollService.getEmployeeHistory(employee_id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve history'
    });
  }
};


const getPayslipHtml = async (req, res) => {
  try {
    const { id } = req.params;
    const html = await payrollService.getPayslipHtml(id);
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    return res.status(error.statusCode || 500).send(`<h3>Error generating payslip: ${error.message}</h3>`);
  }
};


const getSalaryStructure = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const result = await salaryService.getSalaryStructure(employee_id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve salary structure'
    });
  }
};

module.exports = {
  getSalaries,
  reviseSalary,
  getSalaryStructure,
  getEmployeeHistory,
  getPayslipHtml
};
