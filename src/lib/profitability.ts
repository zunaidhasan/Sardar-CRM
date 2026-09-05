export interface ProjectProfitInput {
  grossAmount: number;
  feeAmount: number;
  bonus: number;
  expenses: number;
  billableHours: number;
  hourlyRate: number;
}

export interface ProjectProfitResult {
  platformFee: number;
  laborCost: number;
  expenseTotal: number;
  trueNet: number;
  marginPercent: number;
}

export const DEFAULT_HOURLY_RATE = 25;

export function computeProjectProfitability(input: ProjectProfitInput): ProjectProfitResult {
  const platformFee = input.feeAmount || 0;
  const laborCost = (input.billableHours || 0) * (input.hourlyRate || 0);
  const expenseTotal = input.expenses || 0;
  const trueNet = (input.grossAmount || 0) + (input.bonus || 0) - platformFee - laborCost - expenseTotal;
  const gross = input.grossAmount || 0;
  const marginPercent = gross === 0 ? 0 : Math.round((trueNet / gross) * 100);
  return {
    platformFee,
    laborCost: Math.round(laborCost * 100) / 100,
    expenseTotal,
    trueNet: Math.round(trueNet * 100) / 100,
    marginPercent,
  };
}
