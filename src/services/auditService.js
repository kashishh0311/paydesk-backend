const { Op } = require('sequelize');
const { AuditLog, Employee, User, SalaryRecord, PayrollRecord, PayrollDeduction } = require('../models');


class AuditService {
  
  async listAuditLogs({ page = 1, limit = 15, search }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    if (search && search.trim() !== '') {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { action: { [Op.like]: q } },
        { reason: { [Op.like]: q } },
        { '$employee.employee_code$': { [Op.like]: q } },
        { '$employee.first_name$': { [Op.like]: q } },
        { '$employee.last_name$': { [Op.like]: q } }
      ];
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['id', 'DESC']],
      include: [
        {
          model: Employee,
          as: 'employee',
          required: false,
          attributes: ['id', 'employee_code', 'first_name', 'last_name', 'department', 'currency', 'country']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    const serializedRows = rows.map((r) => {
      const json = r.toJSON ? r.toJSON() : r;
      const timestamp = json.createdAt || json.created_at || new Date().toISOString();
      return {
        ...json,
        created_at: timestamp,
        createdAt: timestamp
      };
    });

    return {
      rows: serializedRows,
      count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum)
    };
  }

  async updateAuditLog(id, data, actorId = null) {
    const audit = await AuditLog.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'employee_code', 'first_name', 'last_name', 'department', 'currency', 'country']
        }
      ]
    });

    if (!audit) {
      throw { statusCode: 404, message: 'Audit log record not found' };
    }

    const employee_id = audit.employee_id;
    const employee = audit.employee;

    const currentNewVal = audit.new_value || {};

    if (audit.action === 'DEDUCTION_ADDED') {
      const { deduction_type, deduction_amount, amount, reason: editReason } = data;
      const cleanType = (deduction_type || currentNewVal.deduction_type || 'Custom Deduction').trim();
      const numAmount = Math.max(0, parseFloat(deduction_amount !== undefined ? deduction_amount : (amount !== undefined ? amount : currentNewVal.amount)) || 0);
      const cleanReason = (editReason || audit.reason || `HR custom deduction: ${cleanType}`).trim();

      const oldAmount = parseFloat(currentNewVal.amount) || 0;
      const diff = numAmount - oldAmount;

      const deductionId = currentNewVal.deduction_id;
      let deduction = deductionId ? await PayrollDeduction.findByPk(deductionId) : null;
      if (!deduction && employee_id) {
        deduction = await PayrollDeduction.findOne({
          where: { employee_id, deduction_type: currentNewVal.deduction_type }
        });
      }

      if (deduction) {
        await deduction.update({
          deduction_type: cleanType,
          amount: numAmount,
          reason: cleanReason
        });
      }

      const payrollRecordId = currentNewVal.payroll_record_id;
      let payroll = payrollRecordId ? await PayrollRecord.findByPk(payrollRecordId) : null;
      if (!payroll && employee_id) {
        payroll = await PayrollRecord.findOne({ where: { employee_id }, order: [['id', 'DESC']] });
      }

      if (payroll) {
        const newOther = Math.max(0, (parseFloat(payroll.other_deductions) || 0) + diff);
        const newTotal = Math.max(0, (parseFloat(payroll.total_deductions) || 0) + diff);
        const newNet = parseFloat(payroll.gross_salary) - newTotal;
        await payroll.update({
          other_deductions: newOther,
          total_deductions: newTotal,
          net_salary: newNet
        });
      }

      audit.reason = cleanReason;
      audit.new_value = {
        ...currentNewVal,
        deduction_type: cleanType,
        amount: numAmount
      };
      await audit.save();
      return audit;
    }

    const {
      monthly_increment,
      bonus_amount,
      base_salary,
      reason
    } = data;

    const numMonthlyInc = monthly_increment !== undefined ? Math.max(0, parseFloat(monthly_increment) || 0) : (parseFloat(currentNewVal.monthly_increment) || 0);
    const numBonus = bonus_amount !== undefined ? Math.max(0, parseFloat(bonus_amount) || 0) : (parseFloat(currentNewVal.bonus_amount) || 0);
    const numBase = base_salary !== undefined ? Math.max(0, parseFloat(base_salary) || 0) : (parseFloat(currentNewVal.base_salary) || (employee ? 65000 : 0));
    const cleanReason = (reason || audit.reason || 'Compensation Adjustment').trim();

    const totalBonuses = numBonus + numMonthlyInc;
    const deductions = Math.round(numBase * 0.12);
    const netSalary = numBase + totalBonuses - deductions;

    if (employee_id) {
      const latestSalary = await SalaryRecord.findOne({
        where: { employee_id },
        order: [['effective_date', 'DESC'], ['id', 'DESC']]
      });

      if (latestSalary) {
        await latestSalary.update({
          base_salary: numBase,
          bonuses: totalBonuses,
          deductions,
          net_salary: netSalary,
          reason: cleanReason
        });
      }

      const latestPayroll = await PayrollRecord.findOne({
        where: { employee_id },
        order: [['id', 'DESC']]
      });

      if (latestPayroll) {
        const monthlySalary = Math.round(numBase / 12);
        const basicMonthly = Math.round(monthlySalary * 0.50);
        const hraMonthly = Math.round(basicMonthly * 0.40);
        const specialMonthly = monthlySalary - basicMonthly - hraMonthly;
        const allowancesMonthly = hraMonthly + specialMonthly;
        const grossMonthly = monthlySalary + totalBonuses;
        const epfMonthly = Math.round(basicMonthly * 0.12);
        const ptMonthly = 200;
        const healthMonthly = 120;
        const unpaidDays = parseInt(latestPayroll.unpaid_leave_days, 10) || 0;
        const lopAmount = unpaidDays > 0 ? Math.round((monthlySalary / 30) * unpaidDays) : (parseFloat(latestPayroll.lop_deduction) || 0);
        const otherDeductionAmount = parseFloat(latestPayroll.other_deductions) || 0;
        const statutoryMonthly = epfMonthly + ptMonthly + healthMonthly;
        const totalMonthlyDeductions = statutoryMonthly + lopAmount + otherDeductionAmount;
        const netMonthly = grossMonthly - totalMonthlyDeductions;

        await latestPayroll.update({
          basic_salary: basicMonthly,
          allowances: allowancesMonthly,
          gross_salary: grossMonthly,
          bonus_amount: totalBonuses,
          statutory_deductions: statutoryMonthly,
          total_deductions: totalMonthlyDeductions,
          net_salary: netMonthly
        });

        await PayrollDeduction.update(
          { amount: epfMonthly },
          { where: { payroll_record_id: latestPayroll.id, deduction_type: 'Employee Provident Fund (EPF)' } }
        );
      }
    }

    audit.reason = cleanReason;
    audit.new_value = {
      ...currentNewVal,
      base_salary: numBase,
      monthly_increment: numMonthlyInc,
      bonus_amount: numBonus,
      bonuses: totalBonuses,
      net_salary: netSalary
    };
    await audit.save();

    return audit;
  }

  async deleteAuditLog(id, actorId = null) {
    const audit = await AuditLog.findByPk(id);

    if (!audit) {
      throw { statusCode: 404, message: 'Audit log record not found' };
    }

    const employee_id = audit.employee_id;

    if (audit.action === 'DEDUCTION_ADDED') {
      const currentNewVal = audit.new_value || {};
      const deductionId = currentNewVal.deduction_id;
      const deductionAmount = parseFloat(currentNewVal.amount) || 0;

      let deduction = deductionId ? await PayrollDeduction.findByPk(deductionId) : null;
      if (!deduction && employee_id) {
        deduction = await PayrollDeduction.findOne({
          where: { employee_id, deduction_type: currentNewVal.deduction_type }
        });
      }

      if (deduction) {
        await deduction.destroy();
      }

      const payrollRecordId = currentNewVal.payroll_record_id;
      let payroll = payrollRecordId ? await PayrollRecord.findByPk(payrollRecordId) : null;
      if (!payroll && employee_id) {
        payroll = await PayrollRecord.findOne({ where: { employee_id }, order: [['id', 'DESC']] });
      }

      if (payroll) {
        const newOther = Math.max(0, (parseFloat(payroll.other_deductions) || 0) - deductionAmount);
        const newTotal = Math.max(0, (parseFloat(payroll.total_deductions) || 0) - deductionAmount);
        const newNet = parseFloat(payroll.gross_salary) - newTotal;
        await payroll.update({
          other_deductions: newOther,
          total_deductions: newTotal,
          net_salary: newNet
        });
      }

      await audit.destroy();
      return { success: true, message: 'Deduction audit record and deduction item deleted successfully' };
    }

    if (employee_id && audit.action === 'SALARY_REVISED') {
      const prevVal = audit.previous_value || {};
      const restoredBase = parseFloat(prevVal.base_salary) || 65000;
      const restoredBonus = parseFloat(prevVal.bonus_amount) || 0;
      const restoredDeductions = Math.round(restoredBase * 0.12);
      const restoredNet = restoredBase + restoredBonus - restoredDeductions;

      const allSalaries = await SalaryRecord.findAll({
        where: { employee_id },
        order: [['id', 'DESC']]
      });

      if (allSalaries.length > 1) {
        await allSalaries[0].destroy();
      } else if (allSalaries.length === 1) {
        await allSalaries[0].update({
          base_salary: restoredBase,
          bonuses: restoredBonus,
          deductions: restoredDeductions,
          net_salary: restoredNet,
          reason: 'Compensation Revision Reverted'
        });
      }

      const latestPayroll = await PayrollRecord.findOne({
        where: { employee_id },
        order: [['id', 'DESC']]
      });

      if (latestPayroll) {
        const monthlySalary = Math.round(restoredBase / 12);
        const basicMonthly = Math.round(monthlySalary * 0.50);
        const hraMonthly = Math.round(basicMonthly * 0.40);
        const specialMonthly = monthlySalary - basicMonthly - hraMonthly;
        const allowancesMonthly = hraMonthly + specialMonthly;
        const grossMonthly = monthlySalary + restoredBonus;
        const epfMonthly = Math.round(basicMonthly * 0.12);
        const ptMonthly = 200;
        const healthMonthly = 120;
        const unpaidDays = parseInt(latestPayroll.unpaid_leave_days, 10) || 0;
        const lopAmount = unpaidDays > 0 ? Math.round((monthlySalary / 30) * unpaidDays) : (parseFloat(latestPayroll.lop_deduction) || 0);
        const otherDeductionAmount = parseFloat(latestPayroll.other_deductions) || 0;
        const statutoryMonthly = epfMonthly + ptMonthly + healthMonthly;
        const totalMonthlyDeductions = statutoryMonthly + lopAmount + otherDeductionAmount;
        const netMonthly = grossMonthly - totalMonthlyDeductions;

        await latestPayroll.update({
          basic_salary: basicMonthly,
          allowances: allowancesMonthly,
          gross_salary: grossMonthly,
          bonus_amount: restoredBonus,
          statutory_deductions: statutoryMonthly,
          total_deductions: totalMonthlyDeductions,
          net_salary: netMonthly
        });

        await PayrollDeduction.update(
          { amount: epfMonthly },
          { where: { payroll_record_id: latestPayroll.id, deduction_type: 'Employee Provident Fund (EPF)' } }
        );
      }
    }

    await audit.destroy();
    return { success: true, message: 'Audit entry deleted and compensation reverted successfully' };
  }
}

module.exports = new AuditService();
