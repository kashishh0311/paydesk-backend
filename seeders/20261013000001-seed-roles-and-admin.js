'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const existingRoles = await queryInterface.sequelize.query(
      'SELECT id, name FROM roles;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const existingRoleNames = existingRoles.map(r => r.name);
    const rolesToInsert = [];

    if (!existingRoleNames.includes('admin')) {
      rolesToInsert.push({
        name: 'admin',
        description: 'System Administrator with full access',
        created_at: now,
        updated_at: now
      });
    }

    if (!existingRoleNames.includes('hr_manager')) {
      rolesToInsert.push({
        name: 'hr_manager',
        description: 'HR Manager with employee and salary management access',
        created_at: now,
        updated_at: now
      });
    }

    if (rolesToInsert.length > 0) {
      await queryInterface.bulkInsert('roles', rolesToInsert);
    }

    const allRoles = await queryInterface.sequelize.query(
      'SELECT id, name FROM roles;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const roleMap = {};
    for (const role of allRoles) {
      roleMap[role.name] = role.id;
    }

    const hrEmail = process.env.DEFAULT_HR_EMAIL;
    const hrPassword = process.env.DEFAULT_HR_PASSWORD;
    const hrName = process.env.DEFAULT_HR_NAME;

    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    const adminName = process.env.DEFAULT_ADMIN_NAME;

    const usersToInsert = [];

    const existingUsers = await queryInterface.sequelize.query(
      'SELECT email FROM users;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingEmails = existingUsers.map(u => u.email);

    if (hrEmail && hrPassword && !existingEmails.includes(hrEmail) && roleMap['hr_manager']) {
      const hrPasswordHash = await bcrypt.hash(hrPassword, 10);
      usersToInsert.push({
        name: hrName,
        email: hrEmail,
        password: hrPasswordHash,
        role_id: roleMap['hr_manager'],
        created_at: now,
        updated_at: now
      });
    }

    if (adminEmail && adminPassword && !existingEmails.includes(adminEmail) && roleMap['admin']) {
      const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
      usersToInsert.push({
        name: adminName,
        email: adminEmail,
        password: adminPasswordHash,
        role_id: roleMap['admin'],
        created_at: now,
        updated_at: now
      });
    }

    if (usersToInsert.length > 0) {
      await queryInterface.bulkInsert('users', usersToInsert);
    }
  },

  down: async (queryInterface) => {
    const hrEmail = process.env.DEFAULT_HR_EMAIL;
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;

    const emailsToDelete = [hrEmail, adminEmail].filter(Boolean);
    if (emailsToDelete.length > 0) {
      await queryInterface.bulkDelete('users', {
        email: emailsToDelete
      });
    }
    await queryInterface.bulkDelete('roles', {
      name: ['admin', 'hr_manager']
    });
  }
};
