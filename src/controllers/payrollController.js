const payrollService = require('../services/payrollService');

/**
 * GET /api/v1/payroll/records
 */
const getPayrollRecords = async (req, res) => {
  try {
    const { page, limit, payroll_month, payroll_year, status, department, search } = req.query;
    const result = await payrollService.listPayrollRecords({
      page,
      limit,
      payroll_month,
      payroll_year,
      status,
      department,
      search
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('getPayrollRecords error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve payroll records'
    });
  }
};

/**
 * GET /api/v1/payroll/summary
 */
const getPayrollSummary = async (req, res) => {
  try {
    const { payroll_month, payroll_year } = req.query;
    const result = await payrollService.getPayrollSummary({ payroll_month, payroll_year });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('getPayrollSummary error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve payroll summary'
    });
  }
};

/**
 * POST /api/v1/payroll/calculate
 * 6-Step Workflow Step 3
 */
const calculatePayroll = async (req, res) => {
  try {
    const roleName = (req.user?.role?.name || '').toLowerCase();
    if (roleName.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Administrator access is disabled. Only HR role is authorized.'
      });
    }

    const { payroll_month, payroll_year, total_days, lop_records } = req.body;
    const actorId = req.user?.id || null;

    const result = await payrollService.calculatePayrollBatch({
      payroll_month,
      payroll_year,
      total_days,
      lop_records,
      actorId
    });

    return res.status(200).json({
      success: true,
      message: `Payroll calculation completed for ${result.processedCount} employees.`,
      data: result
    });
  } catch (error) {
    console.error('calculatePayroll error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to calculate payroll'
    });
  }
};

/**
 * POST /api/v1/payroll/approve
 * 6-Step Workflow Step 5
 */
const approvePayroll = async (req, res) => {
  try {
    const roleName = (req.user?.role?.name || '').toLowerCase();
    if (roleName.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Administrator access is disabled. Only HR role is authorized.'
      });
    }

    const { payroll_month, payroll_year, record_ids } = req.body;
    const actorId = req.user?.id || null;

    const result = await payrollService.approvePayrollBatch({
      payroll_month,
      payroll_year,
      record_ids,
      actorId
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('approvePayroll error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to approve payroll'
    });
  }
};

/**
 * POST /api/v1/payroll/payment
 * 6-Step Workflow Step 6
 */
const recordPayment = async (req, res) => {
  try {
    const roleName = (req.user?.role?.name || '').toLowerCase();
    if (roleName.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Administrator access is disabled. Only HR role is authorized.'
      });
    }

    const { payroll_month, payroll_year, record_ids, payment_reference, payment_method } = req.body;
    const actorId = req.user?.id || null;

    const result = await payrollService.recordPaymentBatch({
      payroll_month,
      payroll_year,
      record_ids,
      payment_reference,
      payment_method,
      actorId
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('recordPayment error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to record payment'
    });
  }
};

/**
 * GET /api/v1/payroll/deductions
 */
const getDeductions = async (req, res) => {
  try {
    const { page, limit, deduction_type, search } = req.query;
    const result = await payrollService.listDeductions({
      page,
      limit,
      deduction_type,
      search
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('getDeductions error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve deductions'
    });
  }
};

/**
 * GET /api/v1/payroll/history/:employee_id
 */
const getEmployeeHistory = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const result = await payrollService.getEmployeeHistory(employee_id);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('getEmployeeHistory error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve employee history'
    });
  }
};

/**
 * GET /api/v1/payroll/deductions/:id
 */
const getDeductionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await payrollService.getDeductionById(id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('getDeductionDetails error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve deduction details'
    });
  }
};

/**
 * GET /api/v1/payroll/payslip/:id
 */
const getPayslipDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await payrollService.getPayslipDetails(id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('getPayslipDetails error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve payslip details'
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
    console.error('getPayslipHtml error:', error);
    return res.status(error.statusCode || 500).send(`<h3>Error generating payslip: ${error.message}</h3>`);
  }
};

const downloadPayslip = async (req, res) => {
  try {
    const { id } = req.params;
    const { html, filename } = await payrollService.generatePayslipDownload(id);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    console.error('downloadPayslip error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to download salary slip'
    });
  }
};

module.exports = {
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
};
