const { Op } = require('sequelize');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const { sequelize, Employee, SalaryRecord, AuditLog } = require('../models');


const currencySymbols = {
  INR: '₹',
  USD: '$',
  GBP: '£',
  EUR: '€',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
  SGD: 'S$'
};

const formatAmount = (val, currency = 'USD') => {
  const num = Number(val) || 0;
  const sym = currencySymbols[currency] || (currency ? currency + ' ' : '$');
  const digits = currency === 'JPY' ? 0 : 2;
  return `${sym}${num.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};


const escapeCsv = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};


const streamPdfTable = (res, { title, subtitle, headers, colWidths, rows, filename, orientation = 'landscape' }) => {
  const doc = new PDFDocument({ margin: 25, size: 'A4', layout: orientation });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

  doc.pipe(res);

  const startX = 25;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  const drawHeader = () => {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text(title, startX, 25);
    doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text(subtitle, startX, 42);

    const headerY = 58;
    doc.rect(startX, headerY, tableWidth, 20).fill('#f1f5f9');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155');

    let x = startX;
    headers.forEach((h, i) => {
      doc.text(h, x + 3, headerY + 6, { width: colWidths[i] - 6, lineBreak: false });
      x += colWidths[i];
    });

    return headerY + 20;
  };

  let y = drawHeader();
  const rowHeight = 16;
  const maxY = doc.page.height - 30;

  rows.forEach((row, rIdx) => {
    if (y + rowHeight > maxY) {
      doc.addPage();
      y = drawHeader();
    }

    if (rIdx % 2 === 1) {
      doc.rect(startX, y, tableWidth, rowHeight).fill('#f8fafc');
    }

    doc.rect(startX, y + rowHeight - 0.5, tableWidth, 0.5).fill('#e2e8f0');

    doc.font('Helvetica').fontSize(7.5).fillColor('#1e293b');
    let x = startX;
    row.forEach((cell, cIdx) => {
      doc.text(String(cell ?? ''), x + 3, y + 4, { width: colWidths[cIdx] - 6, lineBreak: false });
      x += colWidths[cIdx];
    });

    y += rowHeight;
  });

  doc.end();
};


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
      attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email', 'department', 'job_title', 'country', 'currency', 'hire_date'],
      limit: 10000,
      order: [['id', 'ASC']],
      raw: true
    });

    const filename = `paydesk_employees_${new Date().toISOString().split('T')[0]}`;
    // Status column removed from all exports
    const headers = ['Employee Code', 'First Name', 'Last Name', 'Email', 'Department', 'Job Title', 'Country', 'Currency', 'Hire Date'];

    // 1. PDF Export
    if (format === 'pdf') {
      const colWidths = [70, 75, 75, 145, 115, 140, 85, 45, 55];
      const pdfRows = rows.map((e) => [
        e.employee_code || '-',
        e.first_name || '',
        e.last_name || '',
        e.email || '',
        e.department || '',
        e.job_title || '',
        e.country || '',
        e.currency || 'USD',
        e.hire_date || ''
      ]);

      return streamPdfTable(res, {
        title: 'PayDesk - Global Employee Directory',
        subtitle: `Export Date: ${new Date().toLocaleString()} | Total Records: ${rows.length}`,
        headers,
        colWidths,
        rows: pdfRows,
        filename,
        orientation: 'landscape'
      });
    }

    // 2. Excel (XLSX) Export
    if (format === 'xlsx') {
      const data = [
        headers,
        ...rows.map((r) => [
          r.employee_code || '',
          r.first_name || '',
          r.last_name || '',
          r.email || '',
          r.department || '',
          r.job_title || '',
          r.country || '',
          r.currency || '',
          r.hire_date || ''
        ])
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Employees');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      return res.send(buffer);
    }

    // 3. CSV Export
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
        escapeCsv(r.hire_date)
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send('\uFEFF' + csvContent);
  } catch (error) {
    console.error('exportEmployees error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate employee export' });
  }
};

/**
 * GET /api/v1/export/salaries
 * Exports salary records with country-specific currencies
 */
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
    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Country',
      'Currency',
      'Annual Income',
      'Monthly Income',
      'Deductions',
      'Net Take-Home'
    ];

    // 1. PDF Export
    if (format === 'pdf') {
      const colWidths = [65, 110, 95, 80, 45, 95, 85, 75, 95];
      const pdfRows = rows.map((r) => {
        const curr = r.employee?.currency || 'USD';
        return [
          r.employee?.employee_code || '-',
          r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : '-',
          r.employee?.department || '-',
          r.employee?.country || '-',
          curr,
          formatAmount(r.base_salary, curr),
          formatAmount(Math.round(Number(r.base_salary) / 12), curr) + '/mo',
          '-' + formatAmount(r.deductions, curr),
          formatAmount(r.net_salary, curr)
        ];
      });

      return streamPdfTable(res, {
        title: 'PayDesk - Employee Salary Report',
        subtitle: `Effective Cycle: ${month} | Export Date: ${new Date().toLocaleString()} | Total Records: ${rows.length}`,
        headers,
        colWidths,
        rows: pdfRows,
        filename,
        orientation: 'landscape'
      });
    }

    // 2. Excel (XLSX) Export
    if (format === 'xlsx') {
      const data = [
        headers,
        ...rows.map((r) => [
          r.employee?.employee_code || '',
          r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : '',
          r.employee?.department || '',
          r.employee?.country || '',
          r.employee?.currency || 'USD',
          Number(r.base_salary) || 0,
          Math.round(Number(r.base_salary) / 12) || 0,
          -Math.abs(Number(r.deductions)) || 0,
          Number(r.net_salary) || 0
        ])
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Salaries');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      return res.send(buffer);
    }

    // 3. CSV Export
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => [
        escapeCsv(r.employee?.employee_code || ''),
        escapeCsv(r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : ''),
        escapeCsv(r.employee?.department || ''),
        escapeCsv(r.employee?.country || ''),
        escapeCsv(r.employee?.currency || 'USD'),
        escapeCsv(Number(r.base_salary).toFixed(2)),
        escapeCsv(Math.round(Number(r.base_salary) / 12).toFixed(2)),
        escapeCsv((-Math.abs(Number(r.deductions))).toFixed(2)),
        escapeCsv(Number(r.net_salary).toFixed(2))
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send('\uFEFF' + csvContent);
  } catch (error) {
    console.error('exportSalaries error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate salary export' });
  }
};

/**
 * GET /api/v1/export/audit-logs
 */
const exportAuditLogs = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const rows = await AuditLog.findAll({
      attributes: ['id', 'action', 'reason', 'createdAt', 'created_at'],
      limit: 10000,
      order: [['id', 'DESC']],
      include: [
        { model: Employee, as: 'employee', attributes: ['employee_code'] }
      ]
    });

    const filename = `paydesk_audit_logs_${new Date().toISOString().split('T')[0]}`;
    const headers = ['Log ID', 'Employee Code', 'Action', 'Justification Reason', 'Created At'];

    if (format === 'xlsx') {
      const data = [
        headers,
        ...rows.map((r) => [
          r.id,
          r.employee?.employee_code || 'SYSTEM',
          r.action,
          r.reason,
          r.createdAt || r.created_at || new Date().toISOString()
        ])
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'AuditLogs');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      return res.send(buffer);
    }

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
