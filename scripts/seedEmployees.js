require('dotenv').config();
const { sequelize, Employee, SalaryRecord } = require('../src/models');

const COUNTRIES = [
  { name: 'United States', currency: 'USD', minSalary: 65000, maxSalary: 185000 },
  { name: 'United Kingdom', currency: 'GBP', minSalary: 45000, maxSalary: 125000 },
  { name: 'Germany', currency: 'EUR', minSalary: 48000, maxSalary: 130000 },
  { name: 'India', currency: 'INR', minSalary: 850000, maxSalary: 3800000 },
  { name: 'Singapore', currency: 'SGD', minSalary: 68000, maxSalary: 165000 },
  { name: 'Japan', currency: 'JPY', minSalary: 5800000, maxSalary: 15500000 },
  { name: 'Canada', currency: 'CAD', minSalary: 62000, maxSalary: 155000 },
  { name: 'Australia', currency: 'AUD', minSalary: 72000, maxSalary: 170000 }
];

const DEPARTMENTS = {
  Engineering: ['Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer', 'DevOps Specialist', 'Engineering Manager'],
  Product: ['Product Manager', 'Associate PM', 'UX Designer', 'Lead Designer', 'Product Analyst'],
  Marketing: ['Growth Lead', 'Content Strategist', 'SEO Manager', 'Digital Marketing Specialist'],
  Sales: ['Account Executive', 'Enterprise AE', 'Sales Development Rep', 'Sales Director'],
  'Human Resources': ['HR Specialist', 'Talent Partner', 'Compensation & Benefits Lead', 'People Operations Manager'],
  Finance: ['Financial Analyst', 'Senior Accountant', 'Payroll Specialist', 'Finance Controller'],
  Operations: ['Operations Lead', 'Supply Chain Analyst', 'Support Team Lead', 'IT Administrator']
};

const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth',
  'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
  'Aarav', 'Ananya', 'Vivaan', 'Diya', 'Aditya', 'Isha', 'Sai', 'Kavya', 'Reyansh', 'Pooja',
  'Liam', 'Emma', 'Noah', 'Olivia', 'Lucas', 'Mia', 'Oliver', 'Charlotte', 'Ethan', 'Amelia',
  'Lukas', 'Sophie', 'Felix', 'Hannah', 'Leon', 'Marie', 'Paul', 'Laura', 'Jonas', 'Lena',
  'Kenji', 'Yuki', 'Ren', 'Hina', 'Haruto', 'Sakura', 'Sota', 'Yui', 'Daiki', 'Aoi'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Sharma', 'Patel', 'Verma', 'Gupta', 'Singh', 'Reddy', 'Mehta', 'Nair', 'Iyer', 'Deshmukh',
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
  'Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato',
  'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Robinson', 'Clark'
];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const seedEmployees = async () => {
  const TOTAL_TARGET = 10000;
  const CHUNK_SIZE = 1000;

  try {
    await sequelize.authenticate();
    console.log('Database connected for employee seeding.');

    const currentCount = await Employee.count();
    if (currentCount >= TOTAL_TARGET) {
      console.log(`Employees already seeded (${currentCount} records exist). Skipping duplicate seeding.`);
      return;
    }

    console.log(`Starting bulk generation of ${TOTAL_TARGET} employee and salary records...`);
    const startTime = Date.now();

    const deptKeys = Object.keys(DEPARTMENTS);

    for (let batch = 0; batch < TOTAL_TARGET / CHUNK_SIZE; batch++) {
      const employeesData = [];

      for (let i = 0; i < CHUNK_SIZE; i++) {
        const globalIndex = batch * CHUNK_SIZE + i + 1;
        const firstName = getRandom(FIRST_NAMES);
        const lastName = getRandom(LAST_NAMES);
        const dept = getRandom(deptKeys);
        const title = getRandom(DEPARTMENTS[dept]);
        const countryInfo = getRandom(COUNTRIES);

        const year = getRandomInt(2019, 2024);
        const month = String(getRandomInt(1, 12)).padStart(2, '0');
        const day = String(getRandomInt(1, 28)).padStart(2, '0');
        const hireDate = `${year}-${month}-${day}`;

        employeesData.push({
          employee_code: `EMP-${String(globalIndex).padStart(6, '0')}`,
          first_name: firstName,
          last_name: lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${globalIndex}@paydesk.internal`,
          department: dept,
          job_title: title,
          country: countryInfo.name,
          currency: countryInfo.currency,
          hire_date: hireDate,
          status: Math.random() < 0.04 ? 'On Leave' : (Math.random() < 0.02 ? 'Terminated' : 'Active')
        });
      }

      // Bulk create employees batch
      const transaction = await sequelize.transaction();
      try {
        const createdEmployees = await Employee.bulkCreate(employeesData, {
          transaction,
          returning: ['id', 'hire_date', 'country', 'currency']
        });

        // Generate salary records for this batch
        const salaryRecordsData = [];

        for (const emp of createdEmployees) {
          const countryInfo = COUNTRIES.find(c => c.name === emp.country) || COUNTRIES[0];
          const baseSalary = getRandomInt(countryInfo.minSalary, countryInfo.maxSalary);
          const bonuses = Math.round(baseSalary * (getRandomInt(5, 20) / 100));
          const deductions = Math.round(baseSalary * (getRandomInt(8, 18) / 100));
          const netSalary = baseSalary + bonuses - deductions;

          // Initial hiring salary record
          salaryRecordsData.push({
            employee_id: emp.id,
            base_salary: baseSalary,
            bonuses,
            deductions,
            net_salary: netSalary,
            effective_date: emp.hire_date,
            reason: 'Initial Hiring Compensation'
          });

          // ~30% have a revision/raise record to show salary history
          if (Math.random() < 0.35) {
            const revisedBase = Math.round(baseSalary * 1.12);
            const revisedBonus = Math.round(revisedBase * (getRandomInt(8, 22) / 100));
            const revisedDeductions = Math.round(revisedBase * (getRandomInt(8, 18) / 100));
            const revisedNet = revisedBase + revisedBonus - revisedDeductions;

            salaryRecordsData.push({
              employee_id: emp.id,
              base_salary: revisedBase,
              bonuses: revisedBonus,
              deductions: revisedDeductions,
              net_salary: revisedNet,
              effective_date: '2025-01-01',
              reason: 'Annual Performance Appraisal'
            });
          }
        }

        await SalaryRecord.bulkCreate(salaryRecordsData, { transaction });
        await transaction.commit();

        console.log(`Inserted batch ${batch + 1}/${TOTAL_TARGET / CHUNK_SIZE} (${(batch + 1) * CHUNK_SIZE} employees)`);
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Successfully completed 10,000 employee and salary records generation in ${duration}s!`);
  } catch (error) {
    console.error('Failed to seed employees:', error.message);
    throw error;
  }
};

if (require.main === module) {
  seedEmployees()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedEmployees;
