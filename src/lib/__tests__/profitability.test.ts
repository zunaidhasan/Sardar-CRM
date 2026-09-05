import { describe, it, expect } from "vitest";
import { computeProjectProfitability } from "@/lib/profitability";

describe("computeProjectProfitability", () => {
  it("subtracts platform fees, expenses, and labor to get true net", () => {
    const result = computeProjectProfitability({
      grossAmount: 1000,
      feeAmount: 200,
      bonus: 0,
      expenses: 50,
      billableHours: 10,
      hourlyRate: 20,
    });

    expect(result.platformFee).toBe(200);
    expect(result.laborCost).toBe(200);
    expect(result.expenseTotal).toBe(50);
    expect(result.trueNet).toBe(550);
    expect(result.marginPercent).toBe(55);
  });

  it("never reports a negative margin percent below -100", () => {
    const result = computeProjectProfitability({
      grossAmount: 100,
      feeAmount: 20,
      bonus: 0,
      expenses: 500,
      billableHours: 0,
      hourlyRate: 0,
    });
    expect(result.trueNet).toBe(-420);
    expect(result.marginPercent).toBeLessThan(0);
  });

  it("treats missing hours and rates as zero labor", () => {
    const result = computeProjectProfitability({
      grossAmount: 500,
      feeAmount: 50,
      bonus: 25,
      expenses: 0,
      billableHours: 0,
      hourlyRate: 40,
    });
    expect(result.laborCost).toBe(0);
    expect(result.trueNet).toBe(475);
  });
});
