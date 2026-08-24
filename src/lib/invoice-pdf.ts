// ---------------------------------------------------------------------------
// Invoice PDF Generation
//
// Generates a print-friendly HTML invoice that can be saved as PDF
// using the browser's print dialog (Ctrl+P → Save as PDF).
//
// This approach avoids heavy PDF libraries while still producing
// professional-looking invoices.
// ---------------------------------------------------------------------------

import type { Invoice, InvoiceItem, Client } from "@/lib/types";
import { formatCurrencyValue } from "@/lib/currency";

interface InvoicePDFData {
  invoice: Invoice;
  items: InvoiceItem[];
  client?: Client | null;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  currency: string;
}

/**
 * Generate a print-friendly HTML string for the invoice.
 * Opens a new window with the invoice for printing/saving as PDF.
 */
export function generateInvoiceHTML(data: InvoicePDFData): string {
  const { invoice, items, client, companyName, companyAddress, companyEmail, currency } = data;

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const total = invoice.amount;

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">${escapeHtml(item.description)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;">${formatCurrencyValue(item.unit_price, currency)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;font-weight:500;">${formatCurrencyValue(item.amount, currency)}</td>
      </tr>`
    )
    .join("");

  // If no items, show a single row with the total
  const invoiceRow =
    items.length === 0
      ? `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;">Invoice payment</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:center;">1</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;">${formatCurrencyValue(total, currency)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;font-weight:500;">${formatCurrencyValue(total, currency)}</td>
      </tr>`
      : itemRows;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${escapeHtml(invoice.invoice_number)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; padding: 40px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div style="max-width:800px;margin:0 auto;">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;">
      <div>
        <h1 style="font-size:28px;font-weight:700;color:#111827;">INVOICE</h1>
        <p style="font-size:14px;color:#6b7280;margin-top:4px;">${escapeHtml(invoice.invoice_number)}</p>
      </div>
      <div style="text-align:right;">
        <p style="font-size:14px;font-weight:600;">${escapeHtml(companyName ?? "Your Company")}</p>
        ${companyAddress ? `<p style="font-size:13px;color:#6b7280;">${escapeHtml(companyAddress)}</p>` : ""}
        ${companyEmail ? `<p style="font-size:13px;color:#6b7280;">${escapeHtml(companyEmail)}</p>` : ""}
      </div>
    </div>

    <!-- Status & Dates -->
    <div style="display:flex;justify-content:space-between;margin-bottom:32px;padding:16px;background:#f9fafb;border-radius:8px;">
      <div>
        <p style="font-size:12px;color:#6b7280;text-transform:uppercase;">Status</p>
        <p style="font-size:14px;font-weight:600;margin-top:2px;text-transform:capitalize;">${escapeHtml(invoice.status)}</p>
      </div>
      <div>
        <p style="font-size:12px;color:#6b7280;text-transform:uppercase;">Issue Date</p>
        <p style="font-size:14px;font-weight:500;margin-top:2px;">${escapeHtml(invoice.issue_date)}</p>
      </div>
      <div>
        <p style="font-size:12px;color:#6b7280;text-transform:uppercase;">Due Date</p>
        <p style="font-size:14px;font-weight:500;margin-top:2px;">${escapeHtml(invoice.due_date ?? "—")}</p>
      </div>
    </div>

    <!-- Bill To -->
    ${client ? `
    <div style="margin-bottom:32px;">
      <p style="font-size:12px;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">Bill To</p>
      <p style="font-size:14px;font-weight:600;">${escapeHtml(client.name)}</p>
      ${client.email ? `<p style="font-size:13px;color:#6b7280;">${escapeHtml(client.email)}</p>` : ""}
      ${client.company ? `<p style="font-size:13px;color:#6b7280;">${escapeHtml(client.company)}</p>` : ""}
    </div>` : ""}

    <!-- Items Table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;color:#6b7280;">Description</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;text-transform:uppercase;color:#6b7280;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;text-transform:uppercase;color:#6b7280;">Unit Price</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;text-transform:uppercase;color:#6b7280;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceRow}
      </tbody>
    </table>

    <!-- Total -->
    <div style="display:flex;justify-content:flex-end;">
      <div style="width:250px;">
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;">
          <span style="color:#6b7280;">Subtotal</span>
          <span>${formatCurrencyValue(subtotal || total, currency)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:18px;font-weight:700;border-top:2px solid #111827;">
          <span>Total</span>
          <span>${formatCurrencyValue(total, currency)}</span>
        </div>
      </div>
    </div>

    <!-- Notes -->
    ${invoice.notes ? `
    <div style="margin-top:40px;padding:16px;background:#f9fafb;border-radius:8px;">
      <p style="font-size:12px;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">Notes</p>
      <p style="font-size:13px;white-space:pre-wrap;">${escapeHtml(invoice.notes)}</p>
    </div>` : ""}

    <!-- Footer -->
    <div style="margin-top:40px;text-align:center;font-size:12px;color:#9ca3af;">
      <p>Thank you for your business!</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Open the invoice in a new window for printing / saving as PDF.
 */
export function openInvoicePDF(data: InvoicePDFData): void {
  const html = generateInvoiceHTML(data);
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    // Auto-trigger print dialog after a short delay
    setTimeout(() => win.print(), 500);
  }
}
