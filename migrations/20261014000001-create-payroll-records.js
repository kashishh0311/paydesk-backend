'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payroll_records', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      payroll_month: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      payroll_year: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      basic_salary: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      allowances: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00,
        allowNull: false
      },
      gross_salary: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      attendance_days: {
        type: Sequelize.INTEGER,
        defaultValue: 22,
        allowNull: false
      },
      unpaid_leave_days: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      lop_deduction: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00,
        allowNull: false
      },
      statutory_deductions: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00,
        allowNull: false
      },
      other_deductions: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00,
        allowNull: false
      },
      total_deductions: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00,
        allowNull: false
      },
      bonus_amount: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00,
        allowNull: false
      },
      net_salary: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('Draft', 'Under Review', 'Approved', 'Processing', 'Paid', 'Failed'),
        defaultValue: 'Draft',
        allowNull: false
      },
      payment_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      payment_reference: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      payment_method: {
        type: Sequelize.STRING(50),
        defaultValue: 'Bank Transfer',
        allowNull: true
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('payroll_records', ['employee_id', 'payroll_month', 'payroll_year'], {
      unique: true,
      name: 'unique_employee_payroll_period'
    });
    await queryInterface.addIndex('payroll_records', ['payroll_month', 'payroll_year']);
    await queryInterface.addIndex('payroll_records', ['status']);

    await queryInterface.createTable('payroll_deductions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      payroll_record_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'payroll_records',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      deduction_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      reason: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      source_record: {
        type: Sequelize.STRING(100),
        defaultValue: 'Automated Attendance Rule',
        allowNull: true
      },
      approval_status: {
        type: Sequelize.ENUM('Approved', 'Pending', 'Rejected'),
        defaultValue: 'Approved',
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('payroll_deductions', ['payroll_record_id']);
    await queryInterface.addIndex('payroll_deductions', ['employee_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('payroll_deductions');
    await queryInterface.dropTable('payroll_records');
  }
};
