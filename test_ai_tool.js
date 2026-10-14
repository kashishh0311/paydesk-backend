const Groq = require('groq-sdk');
const { sequelize } = require('./src/models');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testFullLoop() {
  try {
    const messages = [
      {
        role: 'system',
        content: `You are PayDesk AI, the built-in corporate HR and Payroll Advisory Assistant.
You are communicating directly with an HR Manager, People Director, or Senior Business Executive.

DATABASE ACCESS:
You have access to the execute_sql_query tool to execute read-only SQL SELECT queries against the live PayDesk database.
ALWAYS query the actual database to fetch exact, real-time records. NEVER guess or hardcode numbers or percentages.

DATABASE SCHEMA:
1. employees:
   - id (INT, PK)
   - employee_code (VARCHAR)
   - first_name, last_name, email (VARCHAR)
   - department (VARCHAR)
   - job_title (VARCHAR)
   - country (VARCHAR: Australia, Canada, Germany, India, Japan, Singapore, United Kingdom, United States)
   - currency (VARCHAR: AUD, CAD, EUR, INR, JPY, SGD, GBP, USD)
   - hire_date (DATE)
   - status (ENUM: 'Active', 'On Leave', 'Terminated')

2. salary_records:
   - id (INT, PK)
   - employee_id (INT, FK -> employees.id)
   - base_salary, bonuses, deductions, net_salary (DECIMAL)
   - effective_date (DATE)
   - reason (VARCHAR)

3. payroll_records:
   - id (INT, PK)
   - employee_id (INT, FK -> employees.id)
   - payroll_month (INT, e.g. 10), payroll_year (INT, e.g. 2026)
   - basic_salary, allowances, gross_salary, lop_deduction, statutory_deductions, other_deductions, total_deductions, bonus_amount, net_salary (DECIMAL)
   - attendance_days, unpaid_leave_days (INT)
   - status (ENUM: 'Draft', 'Under Review', 'Approved', 'Processing', 'Paid', 'Failed')

4. payroll_deductions:
   - id (INT, PK)
   - payroll_record_id (INT)
   - employee_id (INT)
   - deduction_type (VARCHAR)
   - reason (VARCHAR)
   - amount (DECIMAL)
   - approval_status (ENUM: 'Approved', 'Pending', 'Rejected')

COMMUNICATION RULES FOR SPEAKING TO HR EXECUTIVES:
1. ALWAYS speak to the user as a polished executive HR & Payroll Advisor, NEVER as a coder, data engineer, or SQL bot.
2. NEVER mention technical database terminology: do NOT say "database schema", "SQL query", "table", "column", "field", "NULL", "SELECT", "master file", or "data set provided".
3. LOCATION & CITY INQUIRIES:
   In our system, workforce locations are categorized by Country/Region (e.g. India, United States, United Kingdom), rather than individual city branches.
   When asked about a specific city like Patna:
   Run a SQL query to fetch the real active employee count and departments for that country (e.g. India).
   Then explain politely and professionally:
   "Currently, PayDesk tracks our workforce distribution at the national country level rather than by specific branch or city. Across our **India operations**, we have **[count] active employees**."
   Follow up with department distributions or compensation metrics for that region.
4. Zero emojis. Use clean markdown formatting.`
      },
      { role: 'user', content: 'Compare September 2026 and October 2026 payroll expenses.' }
    ];

    const tools = [
      {
        type: 'function',
        function: {
          name: 'execute_sql_query',
          description: 'Run a read-only SQL SELECT query against the PayDesk database to fetch real-time employee and payroll data',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The read-only SQL SELECT query to execute' }
            },
            required: ['query']
          }
        }
      }
    ];

    let turns = 0;
    while (turns < 5) {
      turns++;
      const res = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.1
      });

      const choice = res.choices[0];
      const msg = choice.message;

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        messages.push(msg);
        for (const tc of msg.tool_calls) {
          const args = JSON.parse(tc.function.arguments);
          console.log(`[Turn ${turns}] EXECUTING SQL:`, args.query);
          
          const trimmed = args.query.trim().toLowerCase();
          if (!trimmed.startsWith('select') && !trimmed.startsWith('with') && !trimmed.startsWith('show') && !trimmed.startsWith('describe')) {
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: tc.function.name,
              content: JSON.stringify({ error: 'Only read-only SELECT queries are allowed.' })
            });
            continue;
          }

          try {
            const [results] = await sequelize.query(args.query);
            console.log(`[Turn ${turns}] RESULTS count:`, results.length);
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: tc.function.name,
              content: JSON.stringify(results.slice(0, 50)) 
            });
          } catch (sqlErr) {
            console.error(`[Turn ${turns}] SQL ERROR:`, sqlErr.message);
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: tc.function.name,
              content: JSON.stringify({ error: sqlErr.message })
            });
          }
        }
      } else {
        console.log('\nFINAL ASSISTANT ANSWER:\n' + msg.content);
        break;
      }
    }
  } catch (err) {
    console.error('ERROR:', err);
  }
  process.exit(0);
}

testFullLoop();
