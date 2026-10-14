const { sequelize, Employee, SalaryRecord, PayrollDeduction } = require('../src/models');

async function syncAllDeductions() {
  console.log('Starting full deduction synchronization for all employees...');
  const startTime = Date.now();

  try {
    const [epfRes] = await sequelize.query(`
      INSERT INTO payroll_deductions (employee_id, deduction_type, amount, reason, source_record, approval_status, created_at, updated_at)
      SELECT 
        e.id, 
        'Employee Provident Fund (EPF)', 
        COALESCE(ROUND((sr.base_salary / 12) * 0.12), 650.00), 
        'Statutory 12% employee provident fund contribution', 
        'Salary Structure EPF', 
        'Approved', 
        NOW(), 
        NOW()
      FROM employees e
      INNER JOIN (
        SELECT employee_id, base_salary
        FROM salary_records
        WHERE id IN (SELECT MAX(id) FROM salary_records GROUP BY employee_id)
      ) sr ON sr.employee_id = e.id
      LEFT JOIN payroll_deductions pd ON pd.employee_id = e.id AND pd.deduction_type LIKE '%EPF%'
      WHERE pd.id IS NULL;
    `);
    console.log('EPF records synced:', epfRes?.affectedRows || epfRes);

    const [ptRes] = await sequelize.query(`
      INSERT INTO payroll_deductions (employee_id, deduction_type, amount, reason, source_record, approval_status, created_at, updated_at)
      SELECT 
        e.id, 
        'Professional Tax', 
        200.00, 
        'State statutory professional tax levy', 
        'Salary Structure PT', 
        'Approved', 
        NOW(), 
        NOW()
      FROM employees e
      LEFT JOIN payroll_deductions pd ON pd.employee_id = e.id AND pd.deduction_type LIKE '%Professional%'
      WHERE pd.id IS NULL;
    `);
    console.log('Professional Tax records synced:', ptRes?.affectedRows || ptRes);

    const [healthRes] = await sequelize.query(`
      INSERT INTO payroll_deductions (employee_id, deduction_type, amount, reason, source_record, approval_status, created_at, updated_at)
      SELECT 
        e.id, 
        'Health & Medical Premium', 
        120.00, 
        'Corporate group medical and health insurance coverage', 
        'Salary Structure Health', 
        'Approved', 
        NOW(), 
        NOW()
      FROM employees e
      LEFT JOIN payroll_deductions pd ON pd.employee_id = e.id AND pd.deduction_type LIKE '%Health%'
      WHERE pd.id IS NULL;
    `);
    console.log('Health Premium records synced:', healthRes?.affectedRows || healthRes);

    await sequelize.query(`
      UPDATE payroll_deductions 
      SET deduction_type = 'Employee Provident Fund (EPF)' 
      WHERE deduction_type LIKE '%Provident%' AND deduction_type NOT LIKE '%EPF%';
    `);

    const totalCount = await PayrollDeduction.count();
    console.log(`Synchronization complete! Total deduction records in database: ${totalCount} (took ${Date.now() - startTime}ms)`);
  } catch (err) {
    console.error('Error during deduction synchronization:', err);
  }
}

if (require.main === module) {
  syncAllDeductions().then(() => process.exit(0));
}

module.exports = syncAllDeductions;
