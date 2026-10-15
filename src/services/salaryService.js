const { Op } = require('sequelize');
const { sequelize, SalaryRecord, Employee, AuditLog, PayrollDeduction, PayrollRecord } = require('../models');

let isDbSynchronized = false;
async function ensureDbConsistency() {
  if (isDbSynchronized) return;
  try {
    await sequelize.query(
      "UPDATE salary_records SET deductions = ROUND(base_salary * 0.12), net_salary = base_salary + bonuses - ROUND(base_salary * 0.12) WHERE deductions = 0 OR deductions IS NULL"
    );
    await sequelize.query(
      "UPDATE employees SET status = 'Active' WHERE status = 'On Leave'"
    );
    await sequelize.query(
      "UPDATE payroll_deductions SET deduction_type = 'Professional Tax', reason = 'State statutory professional tax levy' WHERE deduction_type LIKE '%Statutory Withholding%'"
    );
    await sequelize.query(
      "UPDATE payroll_deductions SET deduction_type = 'Health & Medical Premium', reason = 'Corporate group medical and health insurance coverage' WHERE deduction_type LIKE '%Medical Benefits%'"
    );

    const payrolls = await PayrollRecord.findAll();
    for (const p of payrolls) {
      const latestSal = await SalaryRecord.findOne({
        where: { employee_id: p.employee_id },
        order: [['effective_date', 'DESC'], ['id', 'DESC']]
      });
      if (latestSal) {
        const base = parseFloat(latestSal.base_salary) || 65000;
        const monthly = Math.round(base / 12);
        const basic = Math.round(monthly * 0.50);
        const allowances = monthly - basic;
        const bonus = parseFloat(p.bonus_amount || 0);
        const epf = Math.round(basic * 0.12);
        const lop = parseFloat(p.lop_deduction || 0);
        const other = parseFloat(p.other_deductions || 0);
        const stat = epf + 200 + 120;
        const totalDed = stat + lop + other;
        const gross = monthly + bonus;
        const net = gross - totalDed;

        if (parseFloat(p.basic_salary) !== basic || parseFloat(p.allowances) !== allowances || parseFloat(p.gross_salary) !== gross) {
          await p.update({
            basic_salary: basic,
            allowances,
            gross_salary: gross,
            statutory_deductions: stat,
            total_deductions: totalDed,
            net_salary: net
          });
          await PayrollDeduction.update(
            { amount: epf },
            { where: { payroll_record_id: p.id, deduction_type: 'Employee Provident Fund (EPF)' } }
          );
        }
      }
    }

    isDbSynchronized = true;
  } catch (e) {
    console.error('Error during database consistency sync:', e.message);
  }
}

class SalaryService {

  async listSalaries({ page = 1, limit = 15, search, department, record_type, month = '2026-10', isExport = false }) {
    await ensureDbConsistency();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = isExport ? Math.min(10000, Math.max(1, parseInt(limit, 10) || 10000)) : Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    const employeeWhere = {};
    const salaryWhere = {};

    if (month) {
      salaryWhere.id = {
        [Op.in]: sequelize.literal(`(
          SELECT MAX(id) FROM salary_records 
          WHERE effective_date <= '${month}-31' 
          GROUP BY employee_id
        )`)
      };
    } else if (record_type === 'current' || !record_type) {
      salaryWhere.id = {
        [Op.in]: sequelize.literal('(SELECT MAX(id) FROM salary_records GROUP BY employee_id)')
      };
    } else if (record_type === 'previous') {
      salaryWhere.id = {
        [Op.notIn]: sequelize.literal('(SELECT MAX(id) FROM salary_records GROUP BY employee_id)')
      };
    }

    if (department) {
      employeeWhere.department = department;
    }

    if (search && search.trim() !== '') {
      const q = `%${search.trim()}%`;
      employeeWhere[Op.or] = [
        { employee_code: { [Op.like]: q } },
        { first_name: { [Op.like]: q } },
        { last_name: { [Op.like]: q } }
      ];
    }

    const { count, rows } = await SalaryRecord.findAndCountAll({
      where: salaryWhere,
      limit: limitNum,
      offset,
      order: [['id', 'DESC']],
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['id', 'employee_code', 'first_name', 'last_name', 'department', 'job_title', 'country', 'currency']
        }
      ]
    });

    if (isExport) {
      return {
        rows: rows.map(r => r.toJSON()),
        count,
        page: pageNum,
        totalPages: 1
      };
    }

    const empIds = rows.map(r => r.employee_id);
    const monthPart = (month || '2026-10').split('-');
    const targetYear = parseInt(monthPart[0], 10) || 2026;
    const targetMonth = parseInt(monthPart[1], 10) || 10;

    const payrolls = await PayrollRecord.findAll({
      where: { 
        employee_id: { [Op.in]: empIds },
        payroll_month: targetMonth,
        payroll_year: targetYear
      },
      order: [['id', 'DESC']]
    });
    const payrollMap = {};
    payrolls.forEach(p => {
      if (!payrollMap[p.employee_id]) payrollMap[p.employee_id] = p;
    });

    // Fallback lookup for any employees who don't have record in selected month yet
    const missingEmpIds = empIds.filter(id => !payrollMap[id]);
    if (missingEmpIds.length > 0) {
      const fallbackPayrolls = await PayrollRecord.findAll({
        where: { employee_id: { [Op.in]: missingEmpIds } },
        order: [['id', 'DESC']]
      });
      fallbackPayrolls.forEach(p => {
        if (!payrollMap[p.employee_id]) payrollMap[p.employee_id] = p;
      });
    }

    const enrichedRows = rows.map(r => {
      const plain = r.toJSON();
      const pr = payrollMap[plain.employee_id];
      const monthlyBase = Math.round(parseFloat(plain.base_salary) / 12);
      const unpaidDays = pr ? parseInt(pr.unpaid_leave_days, 10) || 0 : 0;
      const lopDeduction = unpaidDays > 0 
        ? Math.round((monthlyBase / 30) * unpaidDays) 
        : (pr && parseFloat(pr.lop_deduction) > 0 ? parseFloat(pr.lop_deduction) : 0);

      const epf = Math.round(monthlyBase * 0.12);
      const pt = 200;
      const health = 120;
      const totalStatutory = epf + pt + health;
      const totalDeductionsMonthly = totalStatutory + lopDeduction;

      plain.unpaid_leave_days = unpaidDays;
      plain.lop_deduction = lopDeduction;
      plain.monthly_breakdown = {
        monthly_base: monthlyBase,
        epf,
        pt,
        health,
        lop: lopDeduction,
        total_deductions: totalDeductionsMonthly
      };
      plain.leave_details = {
        casual_leave: {
          type: 'Casual Leave (CL)',
          status: 'Paid',
          days_taken: 1,
          balance: 11,
          deduction: 0,
          note: 'Standard monthly paid allowance'
        },
        sick_leave: {
          type: 'Sick Leave (SL)',
          status: 'Paid',
          days_taken: unpaidDays > 0 ? 0 : 1,
          balance: 10,
          deduction: 0,
          note: 'Approved medical leave'
        },
        unpaid_leave: {
          type: 'Loss of Pay (LOP) / Unpaid Leave',
          status: unpaidDays > 0 ? 'Deducted' : 'None',
          days_taken: unpaidDays,
          per_day_rate: Math.round(monthlyBase / 30),
          total_deduction: lopDeduction,
          note: unpaidDays > 0 
            ? `${unpaidDays} unpaid leave day(s) deducted from monthly salary` 
            : 'Zero unpaid days (full verified attendance)'
        }
      };
      return plain;
    });

    return {
      rows: enrichedRows,
      count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum)
    };
  }

  async reviseSalary(data, actorId = null) {
    const t = await sequelize.transaction();
    try {
      const { employee_id, base_salary, bonuses = 0, deductions = 0, reason, effective_date } = data;

      if (!employee_id || (base_salary === undefined && !data.monthly_increment) || !reason) {
        throw { statusCode: 400, message: 'employee_id, base_salary or monthly_increment, and reason are required' };
      }

      const employee = await Employee.findByPk(employee_id, { transaction: t });
      if (!employee) {
        throw { statusCode: 404, message: 'Employee record not found' };
      }

      const latestSalary = await SalaryRecord.findOne({
        where: { employee_id },
        order: [['effective_date', 'DESC'], ['id', 'DESC']],
        transaction: t
      });

      const currentBase = latestSalary ? parseFloat(latestSalary.base_salary) : 65000;
      const currentMonthly = Math.round(currentBase / 12);

      let numBase;
      let monthlyIncrement = 0;
      if (data.increment_type === 'monthly' && data.monthly_increment) {
        monthlyIncrement = Math.round(parseFloat(data.monthly_increment) || 0);
        numBase = currentBase;
      } else {
        numBase = parseFloat(base_salary) || currentBase;
      }

      const numBonuses = (parseFloat(bonuses) || 0) + monthlyIncrement;
      const statutoryDeductions = Math.round(numBase * 0.12);
      const numDeductions = parseFloat(deductions) > 0 ? parseFloat(deductions) : statutoryDeductions;
      const netSalary = Math.round(numBase + numBonuses - numDeductions);
      const effDate = effective_date || new Date().toISOString().split('T')[0];
      const effMonth = parseInt(effDate.split('-')[1], 10) || 10;
      const effYear = parseInt(effDate.split('-')[0], 10) || 2026;

      if (data.is_increment_planner && !data.is_structure_edit) {
        const existingAudit = await AuditLog.findOne({
          where: {
            employee_id,
            action: 'SALARY_REVISED'
          },
          order: [['id', 'DESC']],
          transaction: t
        });

        const existingPayroll = await PayrollRecord.findOne({
          where: { employee_id, payroll_month: effMonth, payroll_year: effYear },
          transaction: t
        });

        const hasBonusInPayroll = existingPayroll && parseFloat(existingPayroll.bonus_amount) > 0;

        if (existingAudit || hasBonusInPayroll) {
          throw {
            statusCode: 400,
            message: `An increment or bonus has already been added for ${employee.first_name} ${employee.last_name} (${employee.employee_code}). You cannot add it a second time. Please use 'Edit' in the Recent Increment & Bonus Audit Trail to adjust it.`
          };
        }
      }

      const empCurr = employee.currency || (employee.country === 'India' ? 'INR' : 'USD');
      const currSym = empCurr === 'USD' ? '$' : (empCurr === 'EUR' ? '€' : (empCurr === 'GBP' ? '£' : (empCurr === 'INR' ? '₹' : (empCurr === 'JPY' ? '¥' : `${empCurr} `))));

      const newRecord = await SalaryRecord.create(
        {
          employee_id,
          base_salary: numBase,
          bonuses: numBonuses,
          deductions: numDeductions,
          net_salary: netSalary,
          effective_date: effDate,
          reason: data.increment_type === 'monthly'
            ? `Monthly Increment of ${currSym}${monthlyIncrement} (This Month): ${reason}`
            : reason
        },
        { transaction: t }
      );

      const monthlySalary = Math.round(numBase / 12);
      const basicMonthly = Math.round(monthlySalary * 0.50);
      const hraMonthly = Math.round(basicMonthly * 0.40);
      const specialMonthly = monthlySalary - basicMonthly - hraMonthly;
      const allowancesMonthly = hraMonthly + specialMonthly;
      const grossMonthly = monthlySalary + numBonuses;

      const epfMonthly = Math.round(basicMonthly * 0.12);
      const ptMonthly = 200;
      const healthMonthly = 120;

      const latestPayroll = await PayrollRecord.findOne({
        where: { employee_id },
        order: [['id', 'DESC']],
        transaction: t
      });
      const unpaidDays = latestPayroll ? parseInt(latestPayroll.unpaid_leave_days, 10) || 0 : 0;
      const lopAmount = unpaidDays > 0 ? Math.round((monthlySalary / 30) * unpaidDays) : (latestPayroll && parseFloat(latestPayroll.lop_deduction) > 0 ? parseFloat(latestPayroll.lop_deduction) : 0);
      const otherDeductionAmount = Math.max(0, parseFloat(data.other_deduction_amount) || 0);
      const otherDeductionName = (data.other_deduction_name || '').trim() || 'Other Deduction';
      const statutoryMonthlyDeductions = epfMonthly + ptMonthly + healthMonthly;
      const totalMonthlyDeductions = statutoryMonthlyDeductions + lopAmount + otherDeductionAmount;
      const netMonthly = grossMonthly - totalMonthlyDeductions;

      let targetPayroll = await PayrollRecord.findOne({
        where: { employee_id, payroll_month: effMonth, payroll_year: effYear },
        transaction: t
      });

      if (targetPayroll) {
        await targetPayroll.update({
          basic_salary: basicMonthly,
          allowances: allowancesMonthly,
          gross_salary: grossMonthly,
          bonus_amount: numBonuses,
          lop_deduction: lopAmount,
          statutory_deductions: statutoryMonthlyDeductions,
          other_deductions: otherDeductionAmount,
          total_deductions: totalMonthlyDeductions,
          net_salary: netMonthly
        }, { transaction: t });
      } else {
        targetPayroll = await PayrollRecord.create({
          employee_id,
          payroll_month: effMonth,
          payroll_year: effYear,
          basic_salary: basicMonthly,
          allowances: allowancesMonthly,
          gross_salary: grossMonthly,
          bonus_amount: numBonuses,
          attendance_days: 30 - unpaidDays,
          unpaid_leave_days: unpaidDays,
          lop_deduction: lopAmount,
          statutory_deductions: statutoryMonthlyDeductions,
          other_deductions: otherDeductionAmount,
          total_deductions: totalMonthlyDeductions,
          net_salary: netMonthly,
          status: 'Approved'
        }, { transaction: t });
      }

      const payrollRecordId = targetPayroll ? targetPayroll.id : (latestPayroll ? latestPayroll.id : null);

      const deductionItems = [
        {
          payroll_record_id: payrollRecordId,
          employee_id,
          deduction_type: 'Employee Provident Fund (EPF)',
          amount: epfMonthly,
          reason: 'Statutory 12% employee provident fund contribution',
          source_record: 'Salary Structure EPF',
          approval_status: 'Approved'
        },
        {
          payroll_record_id: payrollRecordId,
          employee_id,
          deduction_type: 'Professional Tax',
          amount: ptMonthly,
          reason: 'State statutory professional tax levy',
          source_record: 'Salary Structure PT',
          approval_status: 'Approved'
        },
        {
          payroll_record_id: payrollRecordId,
          employee_id,
          deduction_type: 'Health & Medical Premium',
          amount: healthMonthly,
          reason: 'Corporate group medical and health insurance coverage',
          source_record: 'Salary Structure Health',
          approval_status: 'Approved'
        }
      ];

      if (lopAmount > 0) {
        deductionItems.push({
          payroll_record_id: payrollRecordId,
          employee_id,
          deduction_type: 'Loss of Pay (LOP)',
          amount: lopAmount,
          reason: `Automatic leave deduction (${unpaidDays || 1} unpaid leave days)`,
          source_record: 'Attendance & Leave Sync',
          approval_status: 'Approved'
        });
      }

      if (otherDeductionAmount > 0) {
        deductionItems.push({
          payroll_record_id: payrollRecordId,
          employee_id,
          deduction_type: otherDeductionName,
          amount: otherDeductionAmount,
          reason: `Employer approved custom deduction: ${otherDeductionName}`,
          source_record: 'HR Custom Deduction',
          approval_status: 'Approved'
        });
      }

      await PayrollDeduction.destroy({
        where: {
          employee_id,
          deduction_type: ['Employee Provident Fund (EPF)', 'Professional Tax', 'Health & Medical Premium', 'Loss of Pay (LOP)', 'EPF']
        },
        transaction: t
      });
      await PayrollDeduction.bulkCreate(deductionItems, { transaction: t });

      await AuditLog.create(
        {
          user_id: actorId,
          employee_id,
          action: data.is_structure_edit ? 'SALARY_STRUCTURE_UPDATED' : 'SALARY_REVISED',
          previous_value: latestSalary
            ? {
                base_salary: parseFloat(latestSalary.base_salary),
                monthly_base: currentMonthly,
                monthly_increment: 0,
                net_salary: parseFloat(latestSalary.net_salary)
              }
            : null,
          new_value: {
            base_salary: numBase,
            monthly_base: currentMonthly,
            monthly_increment: monthlyIncrement,
            bonus_amount: parseFloat(bonuses) || 0,
            bonuses: numBonuses,
            other_deduction_name: otherDeductionAmount > 0 ? otherDeductionName : null,
            other_deduction_amount: otherDeductionAmount,
            currency: empCurr,
            net_salary: netSalary
          },
          reason: data.increment_type === 'monthly'
            ? `Monthly Increment of ${currSym}${monthlyIncrement} (This Month): ${reason}`
            : reason
        },
        { transaction: t }
      );

      await t.commit();
      return newRecord;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async getSalaryStructure(employee_id) {
    const employee = await Employee.findByPk(employee_id, {
      attributes: ['id', 'employee_code', 'first_name', 'last_name', 'department', 'job_title', 'country', 'currency']
    });

    if (!employee) {
      throw { statusCode: 404, message: 'Employee not found' };
    }

    const currentRecord = await SalaryRecord.findOne({
      where: { employee_id },
      order: [['effective_date', 'DESC'], ['id', 'DESC']]
    });

    const baseSalary = currentRecord ? parseFloat(currentRecord.base_salary) : 600000;
    const bonuses = currentRecord ? parseFloat(currentRecord.bonuses) : 0;
    const deductions = currentRecord ? parseFloat(currentRecord.deductions) : Math.round(baseSalary * 0.12);
    const netSalary = currentRecord ? parseFloat(currentRecord.net_salary) : (baseSalary + bonuses - deductions);

    const monthlySalary = Math.round(baseSalary / 12);
    const basicSalary = Math.round(monthlySalary * 0.50);
    const hra = Math.round(basicSalary * 0.40);
    const specialAllowance = monthlySalary - basicSalary - hra;
    const epf = Math.round(basicSalary * 0.12);
    const professionalTax = 200;
    const healthInsurance = 120;

    const payroll = await PayrollRecord.findOne({
      where: { employee_id },
      order: [['id', 'DESC']]
    });
    const unpaidDays = payroll ? parseInt(payroll.unpaid_leave_days, 10) || 0 : 0;
    const lop = unpaidDays > 0 
      ? Math.round((monthlySalary / 30) * unpaidDays) 
      : (payroll && parseFloat(payroll.lop_deduction) > 0 ? parseFloat(payroll.lop_deduction) : 0);

    const otherDeductions = payroll ? parseFloat(payroll.other_deductions) || 0 : 0;
    const customDeductions = payroll ? await PayrollDeduction.findAll({
      where: {
        payroll_record_id: payroll.id,
        deduction_type: { [Op.notIn]: ['Employee Provident Fund (EPF)', 'Professional Tax', 'Health & Medical Premium', 'Loss of Pay (LOP)', 'EPF'] }
      }
    }) : [];

    const grossMonthly = monthlySalary + bonuses;
    const monthlyDeductions = epf + professionalTax + healthInsurance + lop + otherDeductions;
    const monthlyNet = grossMonthly - monthlyDeductions;

    return {
      employee,
      currentRecord,
      base_salary: baseSalary,
      bonuses,
      deductions: currentRecord ? parseFloat(currentRecord.deductions) : (monthlyDeductions * 12),
      net_salary: currentRecord ? parseFloat(currentRecord.net_salary) : (baseSalary + bonuses - (monthlyDeductions * 12)),
      effective_date: currentRecord?.effective_date || new Date().toISOString().split('T')[0],
      reason: currentRecord?.reason || 'Standard Structure',
      monthly: {
        basic_salary: basicSalary,
        hra,
        special_allowance: specialAllowance,
        gross_monthly: grossMonthly,
        monthly_base: monthlySalary,
        epf,
        professional_tax: professionalTax,
        health_insurance: healthInsurance,
        lop,
        other_deductions: otherDeductions,
        custom_deductions: customDeductions.map(d => ({ type: d.deduction_type, amount: parseFloat(d.amount) || 0, reason: d.reason })),
        total_deductions: monthlyDeductions,
        net_monthly: monthlyNet
      },
      leaves: {
        casual_leave: {
          type: 'Casual Leave (CL)',
          status: 'Paid',
          days_taken: 1,
          balance: 11,
          deduction: 0,
          note: 'Standard monthly paid quota'
        },
        sick_leave: {
          type: 'Sick Leave (SL)',
          status: 'Paid',
          days_taken: unpaidDays > 0 ? 0 : 1,
          balance: 10,
          deduction: 0,
          note: 'Approved medical leave'
        },
        unpaid_leave: {
          type: 'Loss of Pay (LOP) / Unpaid Leave',
          status: unpaidDays > 0 ? 'Deducted' : 'None',
          days_taken: unpaidDays,
          per_day_rate: Math.round(monthlySalary / 30),
          total_deduction: lop,
          note: unpaidDays > 0 
            ? `${unpaidDays} unpaid leave day(s) deducted from monthly salary` 
            : 'Zero unpaid days (full verified attendance)'
        }
      }
    };
  }
}

module.exports = new SalaryService();
