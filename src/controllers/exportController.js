const { Op } = require('sequelize');
const { sequelize, Employee, SalaryRecord, AuditLog } = require('../models');

/**
 * Helper to escape CSV cell
 */
const escapeCsv = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * GET /api/v1/export/employees
 * Exports filtered employee records respecting active filters
 */
const exportEmployees = async (req, res) => {
  try {
    const { format = 'csv', search, department, country } = req.query;
    const where = {};

    if (department) where.department = department;
    if (country) where.country = country;
    if (search && search.trim() !== '') {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { employee_code: { [Op.like]: q } },
        { first_name: { [Op.like]: q } },
        { last_name: { [Op.like]: q } },
        { email: { [Op.like]: q } }
      ];
    }

    const rows = await Employee.findAll({
      where,
      limit: 10000,
      order: [['id', 'ASC']]
    });

    const filename = `paydesk_employees_${new Date().toISOString().split('T')[0]}`;

    if (format === 'pdf') {
      // Printable HTML designed for instant PDF saving/printing
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>PayDesk Employee Directory Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; margin: 20px; color: #1e293b; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            p { margin-top: 0; color: #64748b; font-size: 11px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
            td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body onload="window.print()">
          <h1>PayDesk - Global Employee Directory</h1>
          <p>Export Date: ${new Date().toLocaleString()} | Total Records: ${rows.length}</p>
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Name</th><th>Email</th><th>Department</th><th>Job Title</th><th>Country</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (e) => `
                <tr>
                  <td>${e.employee_code}</td>
                  <td>${e.first_name} ${e.last_name}</td>
                  <td>${e.email}</td>
                  <td>${e.department}</td>
                  <td>${e.job_title}</td>
                  <td>${e.country} (${e.currency})</td>
                  <td>${e.status}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    // CSV or Excel compatible format
    const headers = ['Employee Code', 'First Name', 'Last Name', 'Email', 'Department', 'Job Title', 'Country', 'Currency', 'Hire Date', 'Status'];
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => [
        escapeCsv(r.employee_code),
        escapeCsv(r.first_name),
        escapeCsv(r.last_name),
        escapeCsv(r.email),
        escapeCsv(r.department),
        escapeCsv(r.job_title),
        escapeCsv(r.country),
        escapeCsv(r.currency),
        escapeCsv(r.hire_date),
        escapeCsv(r.status)
      ].join(','))
    ].join('\n');

    if (format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xls"`);
      return res.send('\uFEFF' + csvContent);
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send('\uFEFF' + csvContent);
  } catch (error) {
    console.error('exportEmployees error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate employee export' });
  }
};

const exportSalaries = async (req, res) => {
  try {
    const { format = 'csv', department, search, month = '2026-10', record_type = 'current' } = req.query;

    const salaryService = require('../services/salaryService');
    const result = await salaryService.listSalaries({
      page: 1,
      limit: 10000,
      month,
      department,
      search,
      record_type,
      isExport: true
    });

    const rows = result.rows || [];
    const filename = `paydesk_salaries_${month}_${new Date().toISOString().split('T')[0]}`;

    if (format === 'pdf') {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>PayDesk Employee Salary Report - ${month}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; margin: 20px; color: #1e293b; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            p { margin-top: 0; color: #64748b; font-size: 11px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
            td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
            .text-right { text-align: right; }
            .text-red { color: #ef4444; }
            .font-bold { font-weight: 700; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body onload="window.print()">
          <h1>PayDesk - Employee Salary Report</h1>
          <p>Effective Cycle: ${month} | Export Date: ${new Date().toLocaleString('en-IN')} | Total Records: ${rows.length}</p>
          <table>
            <thead>
              <tr>
                <th>Employee Code</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th class="text-right">Annual Income (₹)</th>
                <th class="text-right">Monthly Income (₹)</th>
                <th class="text-right">Deductions (₹)</th>
                <th class="text-right">Net Take-Home (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r) => `
                <tr>
                  <td>${r.employee?.employee_code || '-'}</td>
                  <td>${r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : '-'}</td>
                  <td>${r.employee?.department || '-'}</td>
                  <td class="text-right">₹${Number(r.base_salary).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="text-right">₹${Math.round(Number(r.base_salary) / 12).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</td>
                  <td class="text-right text-red">-₹${Number(r.deductions).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="text-right font-bold">₹${Number(r.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Annual Income',
      'Monthly Income',
      'Deductions',
      'Net Take-Home'
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => [
        escapeCsv(r.employee?.employee_code || ''),
        escapeCsv(r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : ''),
        escapeCsv(r.employee?.department || ''),
        escapeCsv(Number(r.base_salary).toFixed(2)),
        escapeCsv(Math.round(Number(r.base_salary) / 12).toFixed(2)),
        escapeCsv((-Math.abs(Number(r.deductions))).toFixed(2)),
        escapeCsv(Number(r.net_salary).toFixed(2))
      ].join(','))
    ].join('\n');

    if (format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xls"`);
      return res.send('\uFEFF' + csvContent);
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send('\uFEFF' + csvContent);
  } catch (error) {
    console.error('exportSalaries error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate salary export' });
  }
};

const exportAuditLogs = async (req, res) => {
  try {
    const rows = await AuditLog.findAll({
      limit: 10000,
      order: [['id', 'DESC']],
      include: [
        { model: Employee, as: 'employee', attributes: ['employee_code'] }
      ]
    });

    const filename = `paydesk_audit_logs_${new Date().toISOString().split('T')[0]}`;
    const headers = ['Log ID', 'Employee Code', 'Action', 'Justification Reason', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => [
        escapeCsv(r.id),
        escapeCsv(r.employee?.employee_code || 'SYSTEM'),
        escapeCsv(r.action),
        escapeCsv(r.reason),
        escapeCsv(r.createdAt || r.created_at || new Date().toISOString())
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send('\uFEFF' + csvContent);
  } catch (error) {
    console.error('exportAuditLogs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate audit log export' });
  }
};

module.exports = {
  exportEmployees,
  exportSalaries,
  exportAuditLogs
};
