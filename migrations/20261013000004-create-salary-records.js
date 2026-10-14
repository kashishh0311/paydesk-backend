'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('salary_records', {
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
      base_salary: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      bonuses: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00,
        allowNull: false
      },
      deductions: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00,
        allowNull: false
      },
      net_salary: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      effective_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      reason: {
        type: Sequelize.STRING(255),
        defaultValue: 'Initial Hiring Structure',
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

    await queryInterface.addIndex('salary_records', ['employee_id']);
    await queryInterface.addIndex('salary_records', ['effective_date']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('salary_records');
  }
};
