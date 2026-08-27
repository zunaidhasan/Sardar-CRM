"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  DollarSign,
  MoreHorizontal,
  Plus,
  Trash2,
  Edit3,
  Receipt,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  addProjectExpenseAction,
  updateProjectExpenseAction,
  deleteProjectExpenseAction,
} from "@/app/actions";
import { useI18n } from "@/components/i18n-provider";
import { CURRENCY_SYMBOL, EXPENSE_CATEGORY_META } from "@/lib/constants";
import type { ExpenseCategory, ProjectExpense } from "@/lib/types";

interface ProjectExpensesProps {
  projectId: string;
  expenses: ProjectExpense[];
  currency: string;
}

export function ProjectExpenses({
  projectId,
  expenses,
  currency,
}: ProjectExpensesProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] =
    React.useState<ProjectExpense | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Form state
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState<string>("other");
  const [vendor, setVendor] = React.useState("");
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [isBillable, setIsBillable] = React.useState(true);
  const [notes, setNotes] = React.useState("");

  const sym = CURRENCY_SYMBOL[currency] ?? "$";

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const billableExpenses = expenses
    .filter((e) => e.is_billable)
    .reduce((sum, e) => sum + e.amount, 0);
  const nonBillableExpenses = totalExpenses - billableExpenses;

  function resetForm() {
    setDescription("");
    setAmount("");
    setCategory("other");
    setVendor("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setIsBillable(true);
    setNotes("");
    setEditingExpense(null);
  }

  function openEdit(expense: ProjectExpense) {
    setEditingExpense(expense);
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setVendor(expense.vendor ?? "");
    setDate(expense.date);
    setIsBillable(expense.is_billable);
    setNotes(expense.notes ?? "");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const input = {
        description: description.trim(),
        amount: parseFloat(amount) || 0,
        currency,
        category: category as ExpenseCategory,
        vendor: vendor.trim() || null,
        date,
        is_billable: isBillable,
        notes: notes.trim() || null,
      };
      if (editingExpense) {
        await updateProjectExpenseAction(projectId, editingExpense.id, input);
      } else {
        await addProjectExpenseAction(projectId, input);
      }
      resetForm();
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    await deleteProjectExpenseAction(projectId, id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total Expenses</p>
          <p className="text-lg font-semibold">
            {sym}
            {totalExpenses.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Billable</p>
          <p className="text-lg font-semibold text-emerald-600">
            {sym}
            {billableExpenses.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Non-Billable</p>
          <p className="text-lg font-semibold text-amber-600">
            {sym}
            {nonBillableExpenses.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Add expense button */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
        </h4>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? "Edit Expense" : "Add Expense"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expense-desc">Description *</Label>
                <Input
                  id="expense-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Elementor Pro License"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="expense-amount">Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {sym}
                    </span>
                    <Input
                      id="expense-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-7"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-date">Date *</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXPENSE_CATEGORY_META).map(
                        ([key, meta]) => (
                          <SelectItem key={key} value={key}>
                            {meta.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-vendor">Vendor</Label>
                  <Input
                    id="expense-vendor"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Billable to client?</Label>
                  <p className="text-xs text-muted-foreground">
                    Include this cost in the project invoice
                  </p>
                </div>
                <Switch
                  checked={isBillable}
                  onCheckedChange={setIsBillable}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-notes">Notes</Label>
                <Textarea
                  id="expense-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    resetForm();
                    setOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingExpense ? "Update" : "Add Expense"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expense list */}
      {expenses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Receipt className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No expenses tracked yet. Add plugins, hosting, subcontractor costs,
            etc.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => {
            const catMeta = EXPENSE_CATEGORY_META[expense.category] ?? EXPENSE_CATEGORY_META.other;
            return (
              <div
                key={expense.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {expense.description}
                    </p>
                    <Badge
                      className={`${catMeta.color} border-0 text-[10px]`}
                    >
                      {catMeta.label}
                    </Badge>
                    {expense.is_billable && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] dark:bg-emerald-950 dark:text-emerald-300">
                        Billable
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {expense.vendor && `${expense.vendor} • `}
                    {format(new Date(expense.date), "MMM d, yyyy")}
                    {expense.notes && ` • ${expense.notes}`}
                  </p>
                </div>
                <p className="text-sm font-semibold whitespace-nowrap">
                  {sym}
                  {expense.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(expense)}>
                      <Edit3 className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(expense.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
