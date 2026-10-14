'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('employees', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      employee_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      first_name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true
      },
      department: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      job_title: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      country: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      hire_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('Active', 'On Leave', 'Terminated'),
        defaultValue: 'Active',
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

    await queryInterface.addIndex('employees', ['department']);
    await queryInterface.addIndex('employees', ['country']);
    await queryInterface.addIndex('employees', ['status']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('employees');
  }
};
