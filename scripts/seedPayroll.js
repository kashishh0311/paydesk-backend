const { sequelize, Employee, SalaryRecord, PayrollRecord, PayrollDeduction } = require('../src/models');

async function seedPayroll() {
  const transaction = await sequelize.transaction();
  try {
    const existingCount = await PayrollRecord.count({ transaction });
    if (existingCount > 0) {
      console.log(`[seedPayroll] Found ${existingCount} existing payroll records. Skipping.`);
      await transaction.commit();
      return;
    }

    console.log('[seedPayroll] Seeding baseline payroll records and itemized deductions...');
    
    // Fetch a sample of 250 active employees to create rich payroll cycles for
    const employees = await Employee.findAll({
      limit: 250,
      order: [['id', 'ASC']],
      include: [{ model: SalaryRecord, as: 'salaryRecords', limit: 1, order: [['id', 'DESC']] }],
      transaction
    });

    const payrollData = [];
    const deductionsData = [];

    const statuses = ['Paid', 'Paid', 'Approved', 'Under Review', 'Draft', 'Processing', 'Failed'];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const salary = emp.salaryRecords?.[0] || {};
      const baseSalary = Number(salary.base_salary) || 65000;
      const allowances = Math.round(baseSalary * 0.15);
      const bonus = Math.round(baseSalary * 0.08);
      const grossSalary = baseSalary + allowances + bonus;

      // Realistic attendance & LOP
      const unpaidLeave = i % 7 === 0 ? 2 : (i % 11 === 0 ? 1 : 0);
      const totalWorkingDays = 22;
      const attendanceDays = totalWorkingDays - unpaidLeave;
      const lopDeduction = unpaidLeave > 0 ? Math.round((baseSalary / totalWorkingDays) * unpaidLeave) : 0;
      const statutoryDeductions = Math.round(baseSalary * 0.12);
      const otherDeductions = Math.round(baseSalary * 0.03);
      const totalDeductions = lopDeduction + statutoryDeductions + otherDeductions;
      const netSalary = grossSalary - totalDeductions;

      const status = statuses[i % statuses.length];
      const isPaid = status === 'Paid';

      payrollData.push({
        id: i + 1,
        employee_id: emp.id,
        payroll_month: 10,
        payroll_year: 2026,
        basic_salary: baseSalary,
        allowances,
        gross_salary: grossSalary,
        attendance_days: attendanceDays,
        unpaid_leave_days: unpaidLeave,
        lop_deduction: lopDeduction,
        statutory_deductions: statutoryDeductions,
        other_deductions: otherDeductions,
        total_deductions: totalDeductions,
        bonus_amount: bonus,
        net_salary: netSalary,
        status,
        payment_date: isPaid ? '2026-10-05' : null,
        payment_reference: isPaid ? `PAY-202610-${String(emp.id).padStart(5, '0')}` : null,
        payment_method: 'Direct Bank Deposit',
        approved_by: isPaid || status === 'Approved' ? 1 : null,
        approved_at: isPaid || status === 'Approved' ? new Date('2026-10-04') : null
      });

      // Itemized deductions
      if (lopDeduction > 0) {
        deductionsData.push({
          payroll_record_id: i + 1,
          employee_id: emp.id,
          deduction_type: 'Loss of Pay (LOP)',
          reason: `${unpaidLeave} days unapproved absence in pay cycle`,
          amount: lopDeduction,
          source_record: 'Attendance System Sync',
          approval_status: 'Approved'
        });
      }
      deductionsData.push({
        payroll_record_id: i + 1,
        employee_id: emp.id,
        deduction_type: 'Statutory Withholding Tax',
        reason: 'Monthly national payroll tax deduction',
        amount: statutoryDeductions,
        source_record: 'Government Tax Table',
        approval_status: 'Approved'
      });
      deductionsData.push({
        payroll_record_id: i + 1,
        employee_id: emp.id,
        deduction_type: 'Health & Medical Benefits',
        reason: 'Company group medical plan contribution',
        amount: otherDeductions,
        source_record: 'HR Benefits Election',
        approval_status: 'Approved'
      });
    }

    await PayrollRecord.bulkCreate(payrollData, { transaction });
    await PayrollDeduction.bulkCreate(deductionsData, { transaction });

    await transaction.commit();
    console.log(`[seedPayroll] Successfully created ${payrollData.length} payroll records and ${deductionsData.length} itemized deductions.`);
  } catch (error) {
    await transaction.rollback();
    console.error('[seedPayroll] Error seeding payroll:', error);
  }
}

if (require.main === module) {
  seedPayroll().then(() => process.exit(0));
}

module.exports = seedPayroll;
