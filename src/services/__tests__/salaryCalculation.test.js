const { describe, test, expect } = require('@jest/globals');

/**
 * Statutory Salary Engine Unit Tests
 * Fast, deterministic tests covering core statutory compensation formulas
 */

describe('PayDesk Statutory Compensation & Calculation Engine', () => {
  // Canonical statutory helper formulas mirroring backend salary services
  const calculateStatutoryBreakdown = (annualBase, unpaidDays = 0, bonus = 0) => {
    const monthlyBasic = Math.round(annualBase / 12);
    const hra = Math.round(monthlyBasic * 0.40);
    const specialAllowance = Math.round(monthlyBasic * 0.20);
    const totalAllowances = hra + specialAllowance;
    const grossSalary = monthlyBasic + totalAllowances + bonus;

    const epf = Math.round(monthlyBasic * 0.12);
    const professionalTax = 200; // Statutory flat rate
    const healthInsurance = 120; // Corporate group medical
    const perDayRate = Math.round(monthlyBasic / 30);
    const lopDeduction = perDayRate * unpaidDays;
    const totalDeductions = epf + professionalTax + healthInsurance + lopDeduction;

    const netSalary = grossSalary - totalDeductions;

    return {
      monthlyBasic,
      hra,
      specialAllowance,
      totalAllowances,
      grossSalary,
      epf,
      professionalTax,
      healthInsurance,
      lopDeduction,
      totalDeductions,
      netSalary
    };
  };

  test('correctly calculates basic, HRA, and special allowance from annual base', () => {
    const annualBase = 1200000; 
    const result = calculateStatutoryBreakdown(annualBase, 0, 0);

    expect(result.monthlyBasic).toBe(100000);
    expect(result.hra).toBe(40000); // 40% of Basic
    expect(result.specialAllowance).toBe(20000); // 20% of Basic
    expect(result.totalAllowances).toBe(60000); // 60% of Basic
    expect(result.grossSalary).toBe(160000); // Basic + Allowances
  });

  test('accurately computes statutory EPF, PT, and health insurance', () => {
    const annualBase = 600000; // ₹50,000/month basic
    const result = calculateStatutoryBreakdown(annualBase, 0, 0);

    expect(result.monthlyBasic).toBe(50000);
    expect(result.epf).toBe(6000); // 12% of ₹50,000
    expect(result.professionalTax).toBe(200);
    expect(result.healthInsurance).toBe(120);
    expect(result.lopDeduction).toBe(0);
    expect(result.totalDeductions).toBe(6320); // 6000 + 200 + 120
    expect(result.netSalary).toBe(result.grossSalary - 6320);
  });

  test('accurately deducts Loss of Pay (LOP) for unpaid leave days', () => {
    const annualBase = 360000; // ₹30,000/month basic => ₹1,000/day
    const unpaidDays = 3;
    const result = calculateStatutoryBreakdown(annualBase, unpaidDays, 0);

    const expectedPerDay = Math.round(30000 / 30); // 1000
    expect(result.lopDeduction).toBe(expectedPerDay * unpaidDays); // 3000
    expect(result.totalDeductions).toBe(result.epf + 200 + 120 + 3000);
    expect(result.netSalary).toBe(result.grossSalary - result.totalDeductions);
  });

  test('supports one-time monthly increment without altering base salary structure', () => {
    const annualBase = 600000;
    const oneTimeMonthlyIncrement = 5000;

    const withoutBonus = calculateStatutoryBreakdown(annualBase, 0, 0);
    const withBonus = calculateStatutoryBreakdown(annualBase, 0, oneTimeMonthlyIncrement);

    // Monthly basic & statutory deductions remain identical
    expect(withBonus.monthlyBasic).toBe(withoutBonus.monthlyBasic);
    expect(withBonus.epf).toBe(withoutBonus.epf);
    expect(withBonus.totalDeductions).toBe(withoutBonus.totalDeductions);

    // Gross and Net salary increase exactly by the one-time increment
    expect(withBonus.grossSalary).toBe(withoutBonus.grossSalary + 5000);
    expect(withBonus.netSalary).toBe(withoutBonus.netSalary + 5000);
  });
});
