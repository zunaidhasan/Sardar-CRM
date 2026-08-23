"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Clock } from "lucide-react";

// ---------------------------------------------------------------------------
// ROI Calculator Widget
//
// Embeddable widget for agency prospects showing potential savings from
// using Sardar CRM for their cold email campaign vs manual outreach.
// ---------------------------------------------------------------------------

interface CalculatorInputs {
  leadsPerMonth: number;
  avgDealValue: number;
  conversionRate: number;
  hoursPerWeekManual: number;
  hourlyRate: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ROICalculator({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [inputs, setInputs] = React.useState<CalculatorInputs>({
    leadsPerMonth: 500,
    avgDealValue: 2000,
    conversionRate: 3,
    hoursPerWeekManual: 15,
    hourlyRate: 25,
  });

  const update = (field: keyof CalculatorInputs, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setInputs((prev) => ({ ...prev, [field]: num }));
    }
  };

  const monthlyDeals = Math.round((inputs.leadsPerMonth * inputs.conversionRate) / 100);
  const monthlyRevenue = monthlyDeals * inputs.avgDealValue;
  const monthlyManualHours = inputs.hoursPerWeekManual * 4.33;
  const monthlyManualCost = monthlyManualHours * inputs.hourlyRate;

  const crmTimeReduction = 0.6;
  const monthlyCRMHours = monthlyManualHours * (1 - crmTimeReduction);
  const monthlyCRMCost = monthlyCRMHours * inputs.hourlyRate;
  const monthlyTimeSavings = monthlyManualHours - monthlyCRMHours;
  const monthlyCostSavings = monthlyManualCost - monthlyCRMCost;

  const annualRevenue = monthlyRevenue * 12;
  const annualTimeSavings = monthlyTimeSavings * 12;
  const annualCostSavings = monthlyCostSavings * 12;

  const crmMonthlyCost = 29;
  const roi = crmMonthlyCost > 0
    ? Math.round(((monthlyCostSavings - crmMonthlyCost) / crmMonthlyCost) * 100)
    : 0;

  const content = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="leads" className="text-xs">Leads / Month</Label>
          <Input id="leads" type="number" min="0" value={inputs.leadsPerMonth}
            onChange={(e) => update("leadsPerMonth", e.target.value)} className="h-9" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dealValue" className="text-xs">Avg Deal Value ($)</Label>
          <Input id="dealValue" type="number" min="0" value={inputs.avgDealValue}
            onChange={(e) => update("avgDealValue", e.target.value)} className="h-9" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="conversion" className="text-xs">Conversion Rate (%)</Label>
          <Input id="conversion" type="number" min="0" max="100" step="0.5"
            value={inputs.conversionRate}
            onChange={(e) => update("conversionRate", e.target.value)} className="h-9" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hours" className="text-xs">Hours/Week (Manual)</Label>
          <Input id="hours" type="number" min="0" step="0.5"
            value={inputs.hoursPerWeekManual}
            onChange={(e) => update("hoursPerWeekManual", e.target.value)} className="h-9" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate" className="text-xs">Hourly Rate ($)</Label>
          <Input id="rate" type="number" min="0" value={inputs.hourlyRate}
            onChange={(e) => update("hourlyRate", e.target.value)} className="h-9" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-emerald-50 p-4 text-center dark:bg-emerald-950/30">
          <DollarSign className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {formatCurrency(annualCostSavings)}
          </p>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">Annual Time Savings</p>
        </div>
        <div className="rounded-lg border bg-sky-50 p-4 text-center dark:bg-sky-950/30">
          <Clock className="mx-auto mb-1 h-5 w-5 text-sky-600" />
          <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">
            {Math.round(annualTimeSavings)}h
          </p>
          <p className="text-xs text-sky-600/80 dark:text-sky-400/80">Hours Saved / Year</p>
        </div>
        <div className="rounded-lg border bg-violet-50 p-4 text-center dark:bg-violet-950/30">
          <TrendingUp className="mx-auto mb-1 h-5 w-5 text-violet-600" />
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">
            {formatCurrency(annualRevenue)}
          </p>
          <p className="text-xs text-violet-600/80 dark:text-violet-400/80">Projected Revenue</p>
        </div>
        <div className="rounded-lg border bg-amber-50 p-4 text-center dark:bg-amber-950/30">
          <Calculator className="mx-auto mb-1 h-5 w-5 text-amber-600" />
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{roi}%</p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/80">ROI on Sardar CRM</p>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <h4 className="mb-3 text-sm font-medium">Monthly Breakdown</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected deals:</span>
              <span className="font-medium">{monthlyDeals}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Manual hours:</span>
              <span className="font-medium">{Math.round(monthlyManualHours)}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">With CRM:</span>
              <span className="font-medium text-emerald-600">{Math.round(monthlyCRMHours)}h</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Manual cost:</span>
              <span className="font-medium">{formatCurrency(monthlyManualCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CRM cost:</span>
              <span className="font-medium">{formatCurrency(crmMonthlyCost)}/mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net savings:</span>
              <span className="font-medium text-emerald-600">{formatCurrency(monthlyCostSavings - crmMonthlyCost)}/mo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
          60% less manual work
        </Badge>
        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800">
          Auto follow-up scheduling
        </Badge>
        <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800">
          Pipeline visibility
        </Badge>
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4" />
          ROI Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
