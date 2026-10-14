const { Op } = require('sequelize');
const { sequelize, Employee, SalaryRecord, AuditLog, PayrollRecord, PayrollDeduction } = require('../models');


class EmployeeService {

  async listEmployees({ page = 1, limit = 15, search, department, country }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    if (department) {
      where.department = department;
    }

    if (country) {
      where.country = country;
    }

    if (search && search.trim() !== '') {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { employee_code: { [Op.like]: q } },
        { first_name: { [Op.like]: q } },
        { last_name: { [Op.like]: q } },
        { email: { [Op.like]: q } },
        { job_title: { [Op.like]: q } }
      ];
    }

    const { count, rows } = await Employee.findAndCountAll({
      where,
      attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email', 'department', 'job_title', 'country', 'currency', 'hire_date'],
      include: [
        {
          model: SalaryRecord,
          as: 'salaryRecords',
          attributes: ['id', 'base_salary', 'bonuses', 'effective_date'],
          required: false,
          separate: true,
          limit: 1,
          order: [['effective_date', 'DESC'], ['id', 'DESC']]
        }
      ],
      limit: limitNum,
      offset,
      order: [['id', 'DESC']]
    });

    return {
      rows,
      count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum)
    };
  }


  async getEmployeeById(id) {
    return await Employee.findByPk(id, {
      include: [
        {
          model: SalaryRecord,
          as: 'salaryRecords',
          order: [['effective_date', 'DESC']]
        }
      ]
    });
  }


  async createEmployee(data, actorId = null) {
    const t = await sequelize.transaction();
    try {
      const {
        first_name,
        last_name,
        email,
        department,
        job_title,
        country,
        currency,
        hire_date,
        base_salary = 75000,
        status = 'Active'
      } = data;

      if (!first_name || !last_name || !email || !department || !job_title || !country || !currency) {
        throw { statusCode: 400, message: 'All fields (first_name, last_name, email, department, job_title, country, currency) are required' };
      }

      const existing = await Employee.findOne({ where: { email }, transaction: t });
      if (existing) {
        throw { statusCode: 409, message: 'An employee with this email address already exists' };
      }

      const [maxRow] = await sequelize.query(
        "SELECT MAX(CAST(SUBSTRING(employee_code, 5) AS UNSIGNED)) AS max_code FROM employees WHERE employee_code LIKE 'EMP-%'",
        { transaction: t }
      );
      const maxNum = Number(maxRow[0]?.max_code) || 0;
      let nextNum = Math.max(maxNum + 1, (await Employee.count({ transaction: t })) + 1);

      let employee_code = `EMP-${String(nextNum).padStart(6, '0')}`;
      let exists = await Employee.findOne({ where: { employee_code }, transaction: t });
      while (exists) {
        nextNum++;
        employee_code = `EMP-${String(nextNum).padStart(6, '0')}`;
        exists = await Employee.findOne({ where: { employee_code }, transaction: t });
      }

      const newEmployee = await Employee.create(
        {
          employee_code,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          email: email.trim().toLowerCase(),
          department,
          job_title,
          country,
          currency,
          hire_date: hire_date || new Date().toISOString().split('T')[0],
          status
        },
        { transaction: t }
      );

      const numBase = parseFloat(base_salary) || 75000;
      const numBonus = parseFloat(data.bonus || data.bonuses) || 0;
      const numDeduction = Math.round(numBase * 0.12);
      const netSalary = numBase + numBonus - numDeduction;

      await SalaryRecord.create(
        {
          employee_id: newEmployee.id,
          base_salary: numBase,
          bonuses: numBonus,
          deductions: numDeduction,
          net_salary: netSalary,
          effective_date: hire_date || new Date().toISOString().split('T')[0],
          reason: 'Initial Hiring Compensation Structure'
        },
        { transaction: t }
      );

      await AuditLog.create(
        {
          user_id: actorId,
          employee_id: newEmployee.id,
          action: 'EMPLOYEE_CREATED',
          previous_value: null,
          new_value: {
            employee_code,
            name: `${newEmployee.first_name} ${newEmployee.last_name}`,
            department,
            base_salary: numBase
          },
          reason: 'New Employee Profile Setup'
        },
        { transaction: t }
      );

      await t.commit();
      return newEmployee;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }


  async deleteEmployee(id, actorId = null, reason = 'HR Manager requested record removal') {
    const t = await sequelize.transaction();
    try {
      const employee = await Employee.findByPk(id, { transaction: t });
      if (!employee) {
        throw { statusCode: 404, message: 'Employee record not found' };
      }

      // 1. Remove related payroll deductions for all payroll records of this employee
      const payrolls = await PayrollRecord.findAll({ where: { employee_id: employee.id }, attributes: ['id'], transaction: t });
      const payrollIds = payrolls.map((p) => p.id);
      if (payrollIds.length > 0) {
        await PayrollDeduction.destroy({ where: { payroll_record_id: payrollIds }, transaction: t });
      }

      // 2. Remove any direct employee payroll deductions, payroll records, and salary records
      await PayrollDeduction.destroy({ where: { employee_id: employee.id }, transaction: t });
      await PayrollRecord.destroy({ where: { employee_id: employee.id }, transaction: t });
      await SalaryRecord.destroy({ where: { employee_id: employee.id }, transaction: t });

      // 3. Clean up audit logs for this employee to prevent foreign key errors
      await AuditLog.destroy({ where: { employee_id: employee.id }, transaction: t });

      // 4. Destroy employee record
      await employee.destroy({ transaction: t });

      await t.commit();
      return employee;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}

module.exports = new EmployeeService();
