const Groq = require('groq-sdk');
const { sequelize, Employee, SalaryRecord } = require('../models');

let groqClient = null;
if (process.env.GROQ_API_KEY) {
  try {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  } catch (err) {
    console.warn('Groq client initialization warning:', err.message);
  }
}

/**
 * POST /api/v1/ai/chat
 * Groq AI Assistant with backend-grounded, verified database calculations
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

    // 1. Live database calculations - focused 100% on compensation & salary metrics
    const totalEmployees = await Employee.count();

    const [compAverages] = await sequelize.query(`
      SELECT 
        COALESCE(ROUND(AVG(s.base_salary), 0), 0) AS avg_base,
        COALESCE(ROUND(AVG(s.net_salary), 0), 0) AS avg_net,
        COALESCE(ROUND(AVG(s.bonuses), 0), 0) AS avg_bonus,
        COALESCE(ROUND(AVG(s.deductions), 0), 0) AS avg_deduction,
        COALESCE(ROUND(AVG((s.deductions / NULLIF(s.base_salary, 0)) * 100), 1), 0) AS avg_deduction_pct,
        COALESCE(ROUND(AVG((s.bonuses / NULLIF(s.base_salary, 0)) * 100), 1), 0) AS avg_bonus_pct
      FROM salary_records s
    `);
    const averages = compAverages[0] || {};

    const [topDeductions] = await sequelize.query(`
      SELECT 
        e.employee_code, 
        e.first_name, 
        e.last_name, 
        e.department, 
        e.job_title, 
        e.currency, 
        s.base_salary, 
        s.bonuses, 
        s.deductions, 
        s.net_salary, 
        ROUND((s.deductions / NULLIF(s.base_salary, 0)) * 100, 1) as deduction_pct
      FROM employees e
      JOIN salary_records s ON e.id = s.employee_id
      WHERE s.base_salary > 0
      ORDER BY (s.deductions / s.base_salary) DESC
      LIMIT 10
    `);

    const [topEarners] = await sequelize.query(`
      SELECT 
        e.employee_code, 
        e.first_name, 
        e.last_name, 
        e.department, 
        e.job_title, 
        e.currency, 
        s.base_salary, 
        s.bonuses, 
        s.deductions, 
        s.net_salary
      FROM employees e
      JOIN salary_records s ON e.id = s.employee_id
      ORDER BY s.net_salary DESC
      LIMIT 10
    `);

    const [topBonuses] = await sequelize.query(`
      SELECT 
        e.employee_code, 
        e.first_name, 
        e.last_name, 
        e.department, 
        e.job_title, 
        e.currency, 
        s.base_salary, 
        s.bonuses, 
        s.deductions, 
        s.net_salary,
        ROUND((s.bonuses / NULLIF(s.base_salary, 0)) * 100, 1) as bonus_pct
      FROM employees e
      JOIN salary_records s ON e.id = s.employee_id
      ORDER BY s.bonuses DESC
      LIMIT 10
    `);

    const [deptStats] = await sequelize.query(`
      SELECT 
        e.department,
        COUNT(DISTINCT e.id) AS headcount,
        COALESCE(ROUND(AVG(s.base_salary), 0), 0) AS avg_base,
        COALESCE(ROUND(SUM(s.net_salary), 0), 0) AS total_net_spend
      FROM employees e
      LEFT JOIN salary_records s ON e.id = s.employee_id
      GROUP BY e.department
      ORDER BY headcount DESC
    `);

    const [countryStats] = await sequelize.query(`
      SELECT 
        e.country,
        e.currency,
        COUNT(DISTINCT e.id) AS headcount,
        COALESCE(ROUND(AVG(s.base_salary), 0), 0) AS avg_base,
        COALESCE(ROUND(SUM(s.net_salary), 0), 0) AS total_net_spend
      FROM employees e
      LEFT JOIN salary_records s ON e.id = s.employee_id
      GROUP BY e.country, e.currency
      ORDER BY headcount DESC
    `);

    const salarySum = await SalaryRecord.sum('net_salary') || 0;

    const formattedDeductions = topDeductions
      .map((d, i) => `${i + 1}. ${d.first_name} ${d.last_name} (${d.employee_code}) - ${d.department}, ${d.job_title}: Base ${d.currency} ${Number(d.base_salary).toLocaleString()}, Deductions ${d.currency} ${Number(d.deductions).toLocaleString()} (${d.deduction_pct}% of base), Net ${d.currency} ${Number(d.net_salary).toLocaleString()}`)
      .join('\n');

    const formattedTopEarners = topEarners
      .map((e, i) => `${i + 1}. ${e.first_name} ${e.last_name} (${e.employee_code}) - ${e.department}, ${e.job_title}: Net ${e.currency} ${Number(e.net_salary).toLocaleString()}, Base ${e.currency} ${Number(e.base_salary).toLocaleString()}`)
      .join('\n');

    const formattedTopBonuses = topBonuses
      .map((b, i) => `${i + 1}. ${b.first_name} ${b.last_name} (${b.employee_code}) - ${b.department}: Bonus ${b.currency} ${Number(b.bonuses).toLocaleString()} (${b.bonus_pct}% of base)`)
      .join('\n');

    const formattedDept = deptStats
      .map((d) => `${d.department}: ${d.headcount} employees, Avg Base $${Number(d.avg_base).toLocaleString()}, Total Spend $${Number(d.total_net_spend).toLocaleString()}`)
      .join('\n');

    const formattedCountry = countryStats
      .map((c) => `${c.country} (${c.currency}): ${c.headcount} employees, Avg Base ${c.currency} ${Number(c.avg_base).toLocaleString()}, Total Spend ${c.currency} ${Number(c.total_net_spend).toLocaleString()}`)
      .join('\n');

    const systemPrompt = `You are the PayDesk AI Compensation & Salary Management Assistant.
You assist HR Managers with global compensation analytics, budget allocations, deductions, bonuses, and salary compliance.

VERIFIED OVERALL COMPENSATION METRICS (directly queried from MySQL):
- Total Workforce: ${totalEmployees} employees
- Global Net Payroll Spend: approx $${Math.round(salarySum).toLocaleString()}
- Overall Average Base Salary: $${Math.round(Number(averages.avg_base)).toLocaleString()}
- Overall Average Net Take-Home: $${Math.round(Number(averages.avg_net)).toLocaleString()}
- Overall Average Bonus: $${Math.round(Number(averages.avg_bonus)).toLocaleString()} (${averages.avg_bonus_pct}% of base)
- Overall Average Deductions: $${Math.round(Number(averages.avg_deduction)).toLocaleString()} (${averages.avg_deduction_pct}% of base)

VERIFIED EMPLOYEES WITH HIGHEST DEDUCTIONS RELATIVE TO BASE SALARY:
${formattedDeductions}

VERIFIED TOP 10 COMPENSATION EARNERS:
${formattedTopEarners}

VERIFIED TOP 10 BONUS RECIPIENTS:
${formattedTopBonuses}

Department Headcounts & Verified Salaries:
${formattedDept}

Country Headcounts, Currencies & Verified Salaries:
${formattedCountry}

STRICT INSTRUCTIONS:
1. You have complete access to verified individual employee deduction and compensation records. When asked about employees with highest deductions, highest salaries, or bonuses, cite these exact individuals with their names, employee codes, departments, currencies, and numbers.
2. Do NOT say deduction or individual data is unavailable.
3. This is purely a salary management system. Do NOT discuss leaves, vacations, or attendance. Focus exclusively on compensation, base pay, bonuses, deductions, and net take-home pay.
4. Do NOT use emojis anywhere in your response.
5. Keep answers concise, executive, professional, and formatted in clean markdown bullet points or bold text.`;

    const getDeterministicReply = () => {
      const q = (message || '').toLowerCase();
      if (q.includes('deduction')) {
        return `**Employees with Highest Deductions Compared to Base Salary (Verified from MySQL):**\n\n` +
          topDeductions.slice(0, 5).map((d) => (
            `- **${d.first_name} ${d.last_name}** (\`${d.employee_code}\`) - ${d.department}, ${d.job_title}\n` +
            `  - **Base Salary:** ${d.currency} ${Number(d.base_salary).toLocaleString()}\n` +
            `  - **Deductions:** ${d.currency} ${Number(d.deductions).toLocaleString()} (**${d.deduction_pct}%** of base)\n` +
            `  - **Net Take-Home:** ${d.currency} ${Number(d.net_salary).toLocaleString()}`
          )).join('\n\n');
      }
      if (q.includes('highest') || q.includes('top paid') || q.includes('earner') || q.includes('salary')) {
        return `**Top Compensation Earners (Verified from MySQL):**\n\n` +
          topEarners.slice(0, 5).map((e) => (
            `- **${e.first_name} ${e.last_name}** (\`${e.employee_code}\`) - ${e.department}, ${e.job_title}: Net ${e.currency} ${Number(e.net_salary).toLocaleString()} (Base: ${e.currency} ${Number(e.base_salary).toLocaleString()})`
          )).join('\n');
      }
      return `**PayDesk Executive Compensation Summary**\n\n- **Total Workforce:** ${totalEmployees.toLocaleString()} employees across 8 countries.\n- **Annual Payroll Spend:** $${Math.round(salarySum).toLocaleString()} net compensation pool.\n- **Average Base Salary:** $${Math.round(Number(averages.avg_base)).toLocaleString()}.\n- **Average Net Take-Home:** $${Math.round(Number(averages.avg_net)).toLocaleString()}.\n- **Average Deductions:** $${Math.round(Number(averages.avg_deduction)).toLocaleString()} (${averages.avg_deduction_pct}% of base).\n\n*All statistics verified from live MySQL records.*`;
    };

    if (!groqClient) {
      return res.status(200).json({
        success: true,
        data: { reply: getDeterministicReply() }
      });
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-4).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      })),
      { role: 'user', content: message }
    ];

    const modelName = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    let reply = '';
    try {
      // Execute with a 15-second timeout promise
      const groqPromise = groqClient.chat.completions.create({
        messages,
        model: modelName,
        temperature: 0.2,
        max_tokens: 800
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

      const completion = await Promise.race([groqPromise, timeoutPromise]);
      reply = completion.choices[0]?.message?.content || '';
    } catch (groqErr) {
      console.warn('Groq assistant error:', groqErr.status, groqErr.message);

      // Check HTTP 429 Quota Exhausted
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

      // Check Timeout (> 15s)
      if (groqErr.name === 'TimeoutError' || groqErr.code === 'AI_TIMEOUT' || groqErr.status === 504) {
        return res.status(504).json({
          success: false,
          code: 'AI_TIMEOUT',
          message: 'AI request timed out. Please try a simpler question.'
        });
      }

      // Check Network Failure
      if (
        groqErr.code === 'ENOTFOUND' ||
        groqErr.code === 'ECONNREFUSED' ||
        groqErr.type === 'system'
      ) {
        return res.status(503).json({
          success: false,
          code: 'AI_NETWORK_ERROR',
          message: 'Unable to connect to AI service. Please check your network.'
        });
      }

      // Check Provider Internal Error (500, 502, 503)
      if (
        groqErr.status === 500 ||
        groqErr.status === 502 ||
        groqErr.status === 503
      ) {
        return res.status(502).json({
          success: false,
          code: 'AI_PROVIDER_ERROR',
          message: 'AI provider is experiencing issues. Please try again shortly.'
        });
      }

      // If generic error, provide verified database calculations
      reply = getDeterministicReply();
    }

    return res.status(200).json({
      success: true,
      data: {
        reply: reply || `Verified Organization Overview: Managing ${totalEmployees.toLocaleString()} employees with an annual payroll budget of approx $${Math.round(salarySum).toLocaleString()}.`
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
