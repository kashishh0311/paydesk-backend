const Groq = require('groq-sdk');
const { sequelize } = require('../models');

let groqClient = null;
if (process.env.GROQ_API_KEY) {
  try {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  } catch (err) {
    console.warn('Groq client initialization warning:', err.message);
  }
}

/**
 * Validate that an SQL query is strictly a read-only SELECT / DESCRIBE / SHOW query
 */
const isReadOnlySelect = (sql) => {
  if (!sql || typeof sql !== 'string') return false;
  const clean = sql.trim().toLowerCase();

  // Must begin with a read-only keyword
  if (
    !clean.startsWith('select') &&
    !clean.startsWith('with') &&
    !clean.startsWith('show') &&
    !clean.startsWith('describe')
  ) {
    return false;
  }

  // Block any data-modifying or DDL keywords
  const forbidden = [
    'insert ', 'update ', 'delete ', 'drop ', 'alter ', 'truncate ',
    'create ', 'replace ', 'grant ', 'revoke ', 'exec ', 'execute ',
    'call ', 'into outfile', 'into dumpfile'
  ];
  for (const word of forbidden) {
    if (clean.includes(word)) return false;
  }

  return true;
};

/**
 * Clean any accidental programmer/database leak from user-facing assistant response
 */
const cleanUserFacingText = (text) => {
  if (!text) return '';
  let cleaned = text;
  cleaned = cleaned.replace(/the verified data set you provided includes|the data set you provided includes|the data set provided includes/gi, 'Our organizational records include');
  cleaned = cleaned.replace(/the verified data set you provided|the data set you provided|the data set provided/gi, 'our current payroll records');
  cleaned = cleaned.replace(/pull that detail from the employee master file or HRIS where the work[-‑\s]*location field is stored/gi, 'review local branch allocations');
  cleaned = cleaned.replace(/from the employee master file or HRIS where the work[-‑\s]*location field is stored/gi, 'from local office records');
  cleaned = cleaned.replace(/where the work[-‑\s]*location field is stored/gi, 'for local branch records');
  cleaned = cleaned.replace(/Once you have that figure, I can incorporate it into any further compensation or budgeting analysis you require\./gi, 'I can provide full departmental or compensation breakdowns for our national workforce whenever needed.');
  return cleaned;
};

/**
 * POST /api/v1/ai/chat
 * Dynamic AI Assistant: understands user intent, executes live read-only SQL queries on the actual database,
 * performs dynamic mathematical calculations, and formats an executive HR response without hardcoding.
 */
const chatWithAssistant = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Please enter a valid question.'
      });
    }

    // Dynamic fallback if Groq API key is not configured: query real database counts
    if (!groqClient) {
      const [totalCount] = await sequelize.query("SELECT COUNT(*) AS total FROM employees WHERE status = 'Active'");
      const [deptCounts] = await sequelize.query("SELECT department, COUNT(*) AS count FROM employees WHERE status = 'Active' GROUP BY department ORDER BY count DESC LIMIT 5");
      const activeTotal = totalCount[0]?.total || 0;
      const deptList = (deptCounts || []).map(d => `- **${d.department}:** ${Number(d.count).toLocaleString()} employees`).join('\n');

      return res.status(200).json({
        success: true,
        data: {
          reply: `**Active Workforce Overview**\n\nOur organization currently has **${Number(activeTotal).toLocaleString()} active employees** across operational departments:\n\n${deptList}\n\n*(Note: Groq API client is not initialized. Please ensure GROQ_API_KEY is configured in your environment to enable dynamic AI analytics.)*`
        }
      });
    }

    const systemPrompt = `You are PayDesk AI, the built-in corporate HR and Payroll Advisory Assistant.
You are communicating directly with an HR Manager, People Director, or Senior Business Executive.

DATABASE ACCESS VIA TOOL:
You have access to the execute_sql_query tool to execute read-only SQL queries directly against our live MySQL database.
ALWAYS use execute_sql_query to fetch live, verified records from the database. NEVER guess, invent, or hardcode numbers, percentages, or metrics.

DATABASE SCHEMA:
1. employees:
   - id (INT, PK)
   - employee_code (VARCHAR, e.g. 'EMP-001001')
   - first_name, last_name, email (VARCHAR)
   - department (VARCHAR, e.g. 'Engineering', 'Human Resources', 'Sales', 'Finance', 'Marketing', 'Product', 'Legal', 'Operations', 'Support', 'Quality Assurance')
   - job_title (VARCHAR)
   - country (VARCHAR: 'Australia', 'Canada', 'Germany', 'India', 'Japan', 'Singapore', 'United Kingdom', 'United States')
   - currency (VARCHAR: 'AUD', 'CAD', 'EUR', 'INR', 'JPY', 'SGD', 'GBP', 'USD')
   - hire_date (DATE)
   - status (ENUM: 'Active', 'On Leave', 'Terminated')

2. salary_records:
   - id (INT, PK)
   - employee_id (INT, FK -> employees.id)
   - base_salary (DECIMAL, annual base compensation)
   - bonuses (DECIMAL, annual bonus component)
   - deductions (DECIMAL, annual deductions component)
   - net_salary (DECIMAL, base_salary + bonuses - deductions)
   - effective_date (DATE)
   - reason (VARCHAR)

3. payroll_records:
   - id (INT, PK)
   - employee_id (INT, FK -> employees.id)
   - payroll_month (INT, 1-12, e.g. 10 for October)
   - payroll_year (INT, e.g. 2026)
   - basic_salary (DECIMAL, monthly basic salary)
   - allowances (DECIMAL, monthly HRA and special allowances)
   - gross_salary (DECIMAL, basic_salary + allowances + bonus_amount)
   - attendance_days (INT), unpaid_leave_days (INT)
   - lop_deduction (DECIMAL, Loss of Pay deduction)
   - statutory_deductions (DECIMAL, EPF + Professional Tax + Insurance)
   - other_deductions (DECIMAL)
   - total_deductions (DECIMAL)
   - bonus_amount (DECIMAL)
   - net_salary (DECIMAL, gross_salary - total_deductions)
   - status (ENUM: 'Draft', 'Under Review', 'Approved', 'Processing', 'Paid', 'Failed')

4. payroll_deductions:
   - id (INT, PK)
   - payroll_record_id (INT, FK -> payroll_records.id)
   - employee_id (INT, FK -> employees.id)
   - deduction_type (VARCHAR, e.g. 'EPF', 'Professional Tax', 'Health Insurance', 'Loss of Pay', 'TDS')
   - reason (VARCHAR)
   - amount (DECIMAL)
   - approval_status (ENUM: 'Approved', 'Pending', 'Rejected')

COMMUNICATION & PERSONA RULES (CRITICAL):
1. AUDIENCE: You are speaking to an HR Executive / Business User, NOT a programmer or developer.
2. ABSOLUTELY NEVER USE DEVELOPER OR DATABASE JARGON:
   - Do NOT say "database schema", "SQL query", "table", "column", "field", "NULL", "SELECT", "master file", or "data set provided".
   - Instead, speak naturally: "In PayDesk...", "Our workforce records show...", "Across our India operations...", "Under the current payroll cycle...".
3. LOCATION & CITY INQUIRIES (e.g. Patna, Mumbai, London, New York):
   - In our system, workforce locations are recorded at the Country/Region level rather than individual city branches.
   - When asked about a specific city like Patna:
     Query the database for the active headcount and department breakdown for that country (e.g. India).
     Explain politely and clearly:
     "Currently, PayDesk tracks our workforce distribution at the national country level rather than by specific city or local branch. Across our **India operations**, we have **[live count] active employees**."
     Follow up with the department distribution or compensation metrics for that country.
4. ACCURATE DYNAMIC CALCULATIONS:
   - Query the actual database records to calculate live sums, averages, counts, and month-over-month variances.
   - Perform accurate mathematics on the query results. Never use hardcoded multipliers or percentages.
5. FORMATTING:
   - Use clean markdown bullet points, bold key figures, and tables for comparisons.
   - Zero emojis. Maintain a polite, polished, and executive tone.`;

    // Filter conversation history to keep context clean
    const sanitizedHistory = conversationHistory.slice(-4).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: cleanUserFacingText(m.content)
    }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...sanitizedHistory,
      { role: 'user', content: message }
    ];

    const modelName = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const tools = [
      {
        type: 'function',
        function: {
          name: 'execute_sql_query',
          description: 'Run a read-only SQL SELECT query against the live PayDesk database to fetch real-time employee and payroll data. ALWAYS query the database to obtain accurate records and calculations.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The read-only SQL SELECT query to execute on the PayDesk database.'
              }
            },
            required: ['query']
          }
        }
      }
    ];

    let turns = 0;
    const maxTurns = 5;
    let finalReply = '';

    while (turns < maxTurns) {
      turns++;

      let completion;
      try {
        const groqPromise = groqClient.chat.completions.create({
          messages,
          model: modelName,
          temperature: 0.1,
          max_tokens: 1000,
          tools,
          tool_choice: 'auto'
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            const timeoutErr = new Error('AI request timed out. Please try a simpler question.');
            timeoutErr.name = 'TimeoutError';
            timeoutErr.status = 504;
            timeoutErr.code = 'AI_TIMEOUT';
            reject(timeoutErr);
          }, 15000);
        });

        completion = await Promise.race([groqPromise, timeoutPromise]);
      } catch (groqErr) {
        console.warn('Groq assistant error:', groqErr.status, groqErr.message);

        if (
          groqErr.status === 429 ||
          groqErr.statusCode === 429 ||
          (groqErr.message && (groqErr.message.includes('429') || groqErr.message.toLowerCase().includes('quota') || groqErr.message.toLowerCase().includes('rate limit')))
        ) {
          return res.status(429).json({
            success: false,
            code: 'AI_QUOTA_EXHAUSTED',
            message: 'AI service temporarily unavailable. Please try again later.'
          });
        }

        if (groqErr.name === 'TimeoutError' || groqErr.code === 'AI_TIMEOUT' || groqErr.status === 504) {
          return res.status(504).json({
            success: false,
            code: 'AI_TIMEOUT',
            message: 'AI request timed out. Please try a simpler question.'
          });
        }

        // Network or provider error
        if (groqErr.code === 'ENOTFOUND' || groqErr.code === 'ECONNREFUSED' || groqErr.type === 'system') {
          return res.status(503).json({
            success: false,
            code: 'AI_NETWORK_ERROR',
            message: 'Unable to connect to AI service. Please check your network.'
          });
        }

        throw groqErr;
      }

      const messageChoice = completion.choices[0]?.message;
      if (!messageChoice) {
        break;
      }

      // If the model called a tool, execute the query dynamically against the actual database
      if (messageChoice.tool_calls && messageChoice.tool_calls.length > 0) {
        messages.push(messageChoice);

        for (const toolCall of messageChoice.tool_calls) {
          let queryArgs = {};
          try {
            queryArgs = typeof toolCall.function.arguments === 'string'
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments;
          } catch (pErr) {
            queryArgs = { query: '' };
          }

          const rawQuery = queryArgs.query || '';

          if (!isReadOnlySelect(rawQuery)) {
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({ error: 'Security restriction: Only read-only SELECT queries are permitted.' })
            });
            continue;
          }

          try {
            const [results] = await sequelize.query(rawQuery);
            const safeResults = Array.isArray(results) ? results.slice(0, 50) : results;
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify(safeResults)
            });
          } catch (dbErr) {
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({ error: dbErr.message })
            });
          }
        }
      } else {
        finalReply = messageChoice.content || '';
        break;
      }
    }

    finalReply = cleanUserFacingText(finalReply);

    return res.status(200).json({
      success: true,
      data: {
        reply: finalReply || 'I was unable to retrieve data for this request. Please try phrasing your question differently.'
      }
    });
  } catch (error) {
    console.error('chatWithAssistant unhandled error:', error);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Failed to process assistant request.'
    });
  }
};

module.exports = {
  chatWithAssistant
};
