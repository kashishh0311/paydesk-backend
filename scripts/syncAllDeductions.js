const { sequelize, PayrollDeduction, PayrollRecord } = require('../src/models');

async function syncAllDeductions() {
  console.log('[Deduction Sync] Starting automated statutory deduction sync for all employees...');
  const startTime = Date.now();

  try {
    await sequelize.query(`
      INSERT INTO payroll_records (
        employee_id, payroll_month, payroll_year, basic_salary, allowances, 
        gross_salary, attendance_days, unpaid_leave_days, lop_deduction, 
        statutory_deductions, other_deductions, total_deductions, bonus_amount, 
        net_salary, status, created_at, updated_at
      )
      SELECT 
        e.id, 
        10, 
        2026, 
        COALESCE(ROUND(sr.base_salary / 12), 5417), 
        COALESCE(ROUND((sr.base_salary / 12) * 0.60), 3250), 
        COALESCE(ROUND((sr.base_salary / 12) * 1.60), 8667), 
        30, 
        0, 
        0, 
        COALESCE(ROUND((sr.base_salary / 12) * 0.12) + 320, 970), 
        0, 
        COALESCE(ROUND((sr.base_salary / 12) * 0.12) + 320, 970), 
        0, 
        COALESCE(ROUND((sr.base_salary / 12) * 1.60) - (ROUND((sr.base_salary / 12) * 0.12) + 320), 7697), 
        'Approved', 
        NOW(), 
        NOW()
      FROM employees e
      LEFT JOIN (
        SELECT employee_id, base_salary
        FROM salary_records
        WHERE id IN (SELECT MAX(id) FROM salary_records GROUP BY employee_id)
      ) sr ON sr.employee_id = e.id
      LEFT JOIN payroll_records pr ON pr.employee_id = e.id AND pr.payroll_month = 10 AND pr.payroll_year = 2026
      WHERE pr.id IS NULL;
    `);

    // 2. EPF: Statutory 12% employee provident fund contribution
    await sequelize.query(`
      INSERT INTO payroll_deductions (
        payroll_record_id, employee_id, deduction_type, amount, reason, 
        source_record, approval_status, created_at, updated_at
      )
      SELECT 
        pr.id,
        e.id, 
        'Employee Provident Fund (EPF)', 
        COALESCE(ROUND((sr.base_salary / 12) * 0.12), 650.00), 
        'Statutory 12% employee provident fund contribution', 
        'Salary Structure EPF', 
        'Approved', 
        NOW(), 
        NOW()
      FROM employees e
      JOIN payroll_records pr ON pr.employee_id = e.id AND pr.payroll_month = 10 AND pr.payroll_year = 2026
      LEFT JOIN (
        SELECT employee_id, base_salary
        FROM salary_records
        WHERE id IN (SELECT MAX(id) FROM salary_records GROUP BY employee_id)
      ) sr ON sr.employee_id = e.id
      LEFT JOIN payroll_deductions pd ON pd.payroll_record_id = pr.id AND pd.deduction_type LIKE '%EPF%'
      WHERE pd.id IS NULL;
    `);

    // 3. Professional Tax: ₹200.00
    await sequelize.query(`
      INSERT INTO payroll_deductions (
        payroll_record_id, employee_id, deduction_type, amount, reason, 
        source_record, approval_status, created_at, updated_at
      )
      SELECT 
        pr.id,
        e.id, 
        'Professional Tax', 
        200.00, 
        'State statutory professional tax levy', 
        'Salary Structure PT', 
        'Approved', 
        NOW(), 
        NOW()
      FROM employees e
      JOIN payroll_records pr ON pr.employee_id = e.id AND pr.payroll_month = 10 AND pr.payroll_year = 2026
      LEFT JOIN payroll_deductions pd ON pd.payroll_record_id = pr.id AND pd.deduction_type LIKE '%Professional%'
      WHERE pd.id IS NULL;
    `);

    // 4. Health & Medical Premium: ₹120.00
    await sequelize.query(`
      INSERT INTO payroll_deductions (
        payroll_record_id, employee_id, deduction_type, amount, reason, 
        source_record, approval_status, created_at, updated_at
      )
      SELECT 
        pr.id,
        e.id, 
        'Health & Medical Premium', 
        120.00, 
        'Corporate group medical and health insurance coverage', 
        'Salary Structure Health', 
        'Approved', 
        NOW(), 
        NOW()
      FROM employees e
      JOIN payroll_records pr ON pr.employee_id = e.id AND pr.payroll_month = 10 AND pr.payroll_year = 2026
      LEFT JOIN payroll_deductions pd ON pd.payroll_record_id = pr.id AND pd.deduction_type LIKE '%Health%'
      WHERE pd.id IS NULL;
    `);

    const totalCount = await PayrollDeduction.count();
    console.log(`[Deduction Sync] Complete! Total deductions in database: ${totalCount} (took ${Date.now() - startTime}ms)`);
    return totalCount;
  } catch (err) {
    console.error('[Deduction Sync] Error during deduction synchronization:', err);
    throw err;
  }
}

if (require.main === module) {
  syncAllDeductions().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = syncAllDeductions;
