const { execSync } = require('child_process');
const path = require('path');
const { Employee } = require('../models');
const seedEmployees = require('../../scripts/seedEmployees');

const initDatabase = async () => {
  try {
    console.log('[PayDesk Auto-Init] Checking pending migrations...');
    const rootDir = path.resolve(__dirname, '../../');
    
    // Automatically apply pending migrations
    execSync('npx sequelize-cli db:migrate', {
      cwd: rootDir,
      stdio: 'inherit'
    });

    // Automatically apply standard seeders (Roles and Default HR/Admin accounts)
    console.log('[PayDesk Auto-Init] Checking baseline roles and admin accounts...');
    execSync('npx sequelize-cli db:seed:all', {
      cwd: rootDir,
      stdio: 'inherit'
    });

    // Automatically check and seed 10,000 employee records if not already seeded
    const employeeCount = await Employee.count();
    if (employeeCount < 10000) {
      console.log(`[PayDesk Auto-Init] Found ${employeeCount} employees. Auto-seeding to 10,000 records...`);
      await seedEmployees();
    } else {
      console.log(`[PayDesk Auto-Init] 10,000 employees verified (${employeeCount} present).`);
    }

    console.log('[PayDesk Auto-Init] Database ready.');
  } catch (error) {
    console.error('[PayDesk Auto-Init] Notice:', error.message);
  }
};

module.exports = initDatabase;
