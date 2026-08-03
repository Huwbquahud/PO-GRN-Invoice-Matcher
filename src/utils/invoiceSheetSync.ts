export interface InvoiceSheetSyncData {
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: string;
  poReference: string;
  paymentTerms: string;
  lineItems: { description: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  matchStatus: "GREEN" | "AMBER" | "RED" | "APPROVED"; // must always be read live, never cached
  discrepancyReason?: string;
}

export const APPROVED_TAB = "Approved Invoices";
export const UNAPPROVED_TAB = "Unapproved Invoices";

/**
 * Determines which tab + display status an invoice should be written to,
 * based STRICTLY on its current matchStatus. No default fallback — every
 * branch is explicit, so a bug can't silently fall through to the wrong tab.
 */
export function resolveTabAndStatus(invoice: InvoiceSheetSyncData): { tab: string; status: string } {
  const statusUpper = String(invoice.matchStatus || "").toUpperCase();
  switch (statusUpper) {
    case "GREEN":
    case "APPROVED":
      return { tab: APPROVED_TAB, status: "Approved" };
    case "AMBER":
      return { tab: UNAPPROVED_TAB, status: "Amber" };
    case "RED":
    case "REJECTED":
      return { tab: UNAPPROVED_TAB, status: "Red" };
    default:
      throw new Error(
        `Invoice ${invoice.invoiceNumber} has an unrecognised matchStatus: "${invoice.matchStatus}". Refusing to write to sheet with an unknown status.`
      );
  }
}

/**
 * Writes a single invoice to the correct sheet tab, always reading the
 * invoice's CURRENT state passed in — the caller must fetch/recompute the
 * live invoice object immediately before calling this, not reuse an old
 * reference captured earlier in the app's lifecycle.
 */
export async function syncInvoiceToSheet(
  invoice: InvoiceSheetSyncData,
  sheetId: string,
  writeRowFn: (sheetId: string, tab: string, row: Record<string, unknown>) => Promise<void>
) {
  const { tab, status } = resolveTabAndStatus(invoice);

  const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
  let qtyValue: number | string = "";
  let unitPriceValue: number | string = "";

  if (items.length === 1) {
    const rawQ = items[0].quantity;
    const rawP = items[0].unitPrice;
    const parsedQ = Number(rawQ);
    const parsedP = Number(rawP);
    qtyValue = (rawQ !== undefined && rawQ !== null && !isNaN(parsedQ)) ? parsedQ : 0;
    unitPriceValue = (rawP !== undefined && rawP !== null && !isNaN(parsedP)) ? parsedP : 0;
  } else if (items.length > 1) {
    qtyValue = items.map((i) => i.quantity ?? 0).join(", ");
    unitPriceValue = items.map((i) => i.unitPrice ?? 0).join(", ");
  }

  const row = {
    "Supplier Name": invoice.supplierName,
    "Invoice Number": invoice.invoiceNumber,
    "Invoice Date": invoice.invoiceDate,
    "PO Reference": invoice.poReference,
    "Quantity": qtyValue,
    "Unit Price": unitPriceValue,
    "Subtotal": invoice.subtotal,
    "GST Amount": invoice.gstAmount,
    "Total Amount": invoice.totalAmount,
    "Match Status": status,
    "Discrepancy Reason": (invoice.matchStatus === "GREEN" || invoice.matchStatus === "APPROVED") ? "" : invoice.discrepancyReason ?? "",
    "Date Processed": new Date().toISOString(),
  };

  console.log(
    `[SheetSync] Invoice ${invoice.invoiceNumber} | matchStatus=${invoice.matchStatus} -> writing to tab "${tab}" with status "${status}"`
  );

  await writeRowFn(sheetId, tab, row);
}
