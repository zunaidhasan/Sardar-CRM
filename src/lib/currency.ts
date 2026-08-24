// ---------------------------------------------------------------------------
// Multi-Currency Support
//
// Provides exchange rate lookup and currency conversion for invoices,
// projects, and deals. Uses a free API or falls back to static rates.
// ---------------------------------------------------------------------------

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
}

// Static fallback rates (updated periodically in production via API)
const STATIC_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.53,
  INR: 83.12,
  PKR: 278.5,
  BDT: 109.5,
  SGD: 1.34,
  JPY: 149.5,
  CHF: 0.88,
  SEK: 10.42,
  NOK: 10.55,
  DKK: 6.87,
  PLN: 4.02,
  CZK: 22.8,
  HUF: 354.5,
  BRL: 4.97,
  MXN: 17.15,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  TRY: 27.2,
  ZAR: 18.65,
  NGN: 780,
  KES: 153.5,
  EGP: 30.9,
  THB: 35.2,
  VND: 24350,
  IDR: 15450,
  MYR: 4.65,
  PHP: 55.8,
  KRW: 1325,
  TWD: 31.5,
  NZD: 1.64,
  ILS: 3.68,
  RUB: 91.5,
  CNY: 7.24,
  HKD: 7.82,
};

/**
 * Get the exchange rate from one currency to another.
 * Uses cached static rates; in production, replace with a live API call.
 */
export async function getExchangeRate(
  from: string,
  to: string,
): Promise<number> {
  if (from === to) return 1;

  const fromRate = STATIC_RATES[from] ?? 1;
  const toRate = STATIC_RATES[to] ?? 1;

  // Convert: from → USD → to
  return toRate / fromRate;
}

/**
 * Convert an amount from one currency to another.
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
): Promise<number> {
  const rate = await getExchangeRate(from, to);
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Format a currency value with the appropriate symbol.
 */
export function formatCurrencyValue(
  amount: number,
  currency: string,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: options?.minimumFractionDigits ?? 2,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported currencies
    const symbols: Record<string, string> = {
      USD: "$", EUR: "€", GBP: "£", CAD: "C$", AUD: "A$",
      INR: "₹", PKR: "₨", BDT: "৳", SGD: "S$", JPY: "¥",
    };
    return `${symbols[currency] ?? currency} ${amount.toFixed(2)}`;
  }
}

/**
 * List of all supported currencies with display names.
 */
export const SUPPORTED_CURRENCIES: Array<{ code: string; name: string; symbol: string }> = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪" },
];
