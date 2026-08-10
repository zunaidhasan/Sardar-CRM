import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO, differenceInDays } from "date-fns";
import { CURRENCY_SYMBOL } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD"): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? "$";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
  return `${symbol}${formatted}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy");
}

export function formatShortDate(date: string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d");
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? parseISO(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return differenceInDays(d, new Date());
}

export function countdownLabel(date: string | null | undefined): { label: string; urgent: boolean } {
  const days = daysUntil(date);
  if (days === null) return { label: "—", urgent: false };
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, urgent: true };
  if (days === 0) return { label: "Due today", urgent: true };
  if (days === 1) return { label: "1d left", urgent: true };
  if (days <= 3) return { label: `${days}d left`, urgent: true };
  return { label: `${days}d left`, urgent: false };
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join("");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
