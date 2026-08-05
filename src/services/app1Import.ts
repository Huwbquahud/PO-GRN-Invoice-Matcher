import { getCachedAccessToken } from "../lib/firebase";
import { Invoice, PurchaseOrder, GoodsReceivedNote, PaymentRecord } from "../types";
import { performThreeWayMatch } from "../utils/matchingEngine";

const APP1_SHEET_ID_KEY = "ap_app1_source_sheet_id";
const APP1_TAB_NAME_KEY = "ap_app1_source_tab_name";

export function getApp1StoredSheetId(): string {
  return localStorage.getItem(APP1_SHEET_ID_KEY) || localStorage.getItem("ap_target_google_sheet_id") || "";
}

export function setApp1StoredSheetId(id: string) {
  localStorage.setItem(APP1_SHEET_ID_KEY, id.trim());
}

export function getApp1StoredTabName(): string {
  return localStorage.getItem(APP1_TAB_NAME_KEY) || "Verified Invoices";
}

export function setApp1StoredTabName(tab: string) {
  localStorage.setItem(APP1_TAB_NAME_KEY, tab.trim());
}

export interface ImportApp1Summary {
  success: boolean;
  message: string;
  importedCount: number;
  cleanRecordsCount: number;
  duplicatePOCount: number;
  missingPOCount: number;
  skippedRowsCount: number;
  skippedDetails: string[];
  importedInvoices: Invoice[];
  error?: string;
}

/**
 * Reads ALL invoice rows from App 1's exported Google Sheet in ONE single API call
 * and converts them locally into invoice objects in one batch pass.
 */
export async function importApp1InvoicesBulk(
  existingInvoices: Invoice[],
  purchaseOrders: PurchaseOrder[],
  grns: GoodsReceivedNote[],
  paymentHistory: PaymentRecord[],
  sheetIdOverride?: string
): Promise<ImportApp1Summary> {
  const sheetId = (
    sheetIdOverride ||
    getApp1StoredSheetId() ||
    localStorage.getItem("ap_target_google_sheet_id") ||
    ""
  ).trim();

  const accessToken = getCachedAccessToken();
  const tabName = getApp1StoredTabName() || "Verified Invoices";

  if (!sheetId) {
    const errorMsg = "App 1 Source Google Sheet ID/URL not configured. Please enter the Sheet ID or URL in settings.";
    return {
      success: false,
      message: errorMsg,
      importedCount: 0,
      cleanRecordsCount: 0,
      duplicatePOCount: 0,
      missingPOCount: 0,
      skippedRowsCount: 0,
      skippedDetails: [errorMsg],
      importedInvoices: [],
      error: errorMsg,
    };
  }

  if (!accessToken) {
    const errorMsg = "Google Account access token missing. Please click 'Sign in with Google' to authorize import.";
    return {
      success: false,
      message: errorMsg,
      importedCount: 0,
      cleanRecordsCount: 0,
      duplicatePOCount: 0,
      missingPOCount: 0,
      skippedRowsCount: 0,
      skippedDetails: [errorMsg],
      importedInvoices: [],
      error: errorMsg,
    };
  }

  try {
    // SINGLE API CALL: Retrieve the whole used range in one request
    console.log(`[App 1 Import] Triggering bulk fetch for sheet '${sheetId}' tab '${tabName}'...`);
    const res = await fetch("/api/sheets/import-app1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken,
        spreadsheetId: sheetId,
        tabName,
      }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      const err = result.error || "Failed to fetch rows from App 1 Google Sheet.";
      return {
        success: false,
        message: err,
        importedCount: 0,
        cleanRecordsCount: 0,
        duplicatePOCount: 0,
        missingPOCount: 0,
        skippedRowsCount: 0,
        skippedDetails: [err],
        importedInvoices: [],
        error: err,
      };
    }

    const rows: string[][] = result.rows || [];
    if (rows.length === 0) {
      const msg = `Imported 0 invoices in one batch: 0 Clean Records queued for matching, 0 flagged Duplicate PO, 0 flagged Missing PO, 0 rows skipped.`;
      return {
        success: true,
        message: msg,
        importedCount: 0,
        cleanRecordsCount: 0,
        duplicatePOCount: 0,
        missingPOCount: 0,
        skippedRowsCount: 0,
        skippedDetails: [],
        importedInvoices: [],
      };
    }

    // Header row detection
    let dataRows = rows;
    let headerOffset = 1;
    if (
      rows.length > 0 &&
      (rows[0][0]?.toString().toLowerCase().includes("supplier") ||
        rows[0][1]?.toString().toLowerCase().includes("invoice"))
    ) {
      dataRows = rows.slice(1);
      headerOffset = 2;
    }

    let cleanRecordsCount = 0;
    let duplicatePOCount = 0;
    let missingPOCount = 0;
    let skippedRowsCount = 0;
    const skippedDetails: string[] = [];
    const newInvoices: Invoice[] = [];

    // Local set of existing (invoiceNumber + supplierName) for deduplication
    const existingKeys = new Set(
      existingInvoices.map(
        (inv) => `${(inv.invoiceNumber || "").trim().toLowerCase()}|${(inv.supplierName || "").trim().toLowerCase()}`
      )
    );

    // Single pass over retrieved data rows
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const sheetRowNumber = i + headerOffset;

      const supplierName = (row[0] || "").toString().trim();
      const invoiceNumber = (row[1] || "").toString().trim();
      const poNumber = (row[2] || "").toString().trim();
      const invoiceDate = (row[3] || "").toString().trim() || new Date().toISOString().split("T")[0];
      const totalAmountRaw = (row[4] || "").toString().trim();
      const sourceConfidence = (row[5] || "").toString().trim();
      const complianceFlag = (row[6] || "").toString().trim();

      // Skip completely blank rows
      if (!supplierName && !invoiceNumber && !totalAmountRaw) {
        continue;
      }

      // Check missing required fields
      if (!supplierName || !invoiceNumber) {
        skippedRowsCount++;
        skippedDetails.push(`Row ${sheetRowNumber}: Missing ${!supplierName ? "Supplier Name" : "Invoice No."}`);
        continue;
      }

      // Check Total Amount parseability
      const cleanTotalStr = totalAmountRaw.replace(/[^0-9.-]+/g, "");
      const totalAmount = parseFloat(cleanTotalStr);
      if (isNaN(totalAmount)) {
        skippedRowsCount++;
        skippedDetails.push(`Row ${sheetRowNumber} (Inv #${invoiceNumber}): Unparseable Total Amount ("${totalAmountRaw}")`);
        continue;
      }

      // Deduplication check
      const dedupKey = `${invoiceNumber.toLowerCase()}|${supplierName.toLowerCase()}`;
      if (existingKeys.has(dedupKey)) {
        skippedRowsCount++;
        skippedDetails.push(`Row ${sheetRowNumber} (Inv #${invoiceNumber}): Already exists in queue (skipped duplicate)`);
        continue;
      }

      // Record key to prevent intra-batch duplicates
      existingKeys.add(dedupKey);

      // Create invoice record
      const baseInvoice: Invoice = {
        id: `inv-app1-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        invoiceNumber,
        supplierName,
        poNumber,
        invoiceDate,
        totalAmount,
        lineItems: [
          {
            description: poNumber ? `Purchased Items (PO #${poNumber})` : "Hardware Supplies & Equipment",
            qty: 1,
            unitPrice: totalAmount,
            total: totalAmount,
          },
        ],
        subtotal: totalAmount,
        gst: 0,
        status: "PENDING",
      };

      // Requirement 5: Apply pre-check logic based on complianceFlag before normal 3-way matching
      const flagLower = complianceFlag.toLowerCase();
      if (flagLower.includes("duplicate") || flagLower === "duplicate po") {
        baseInvoice.status = "RED";
        baseInvoice.reviewNotes = "Flagged as duplicate by Smart Invoice Capture (App 1).";
        duplicatePOCount++;
      } else if (flagLower.includes("missing") || flagLower === "missing po") {
        baseInvoice.status = "RED";
        baseInvoice.reviewNotes = "No PO number found by Smart Invoice Capture (App 1) — cannot verify.";
        missingPOCount++;
      } else {
        // "Clean Record" -> proceed with the app's existing normal 3-way matching process
        cleanRecordsCount++;
        const matchRes = performThreeWayMatch(baseInvoice, purchaseOrders, grns, paymentHistory);
        baseInvoice.status = matchRes.overallStatus;
        baseInvoice.reviewNotes = matchRes.explanations.join(" | ");
      }

      newInvoices.push(baseInvoice);
    }

    const importedCount = newInvoices.length;
    const summaryMsg = `Imported ${importedCount} invoice${importedCount === 1 ? "" : "s"} in one batch: ${cleanRecordsCount} Clean Record${cleanRecordsCount === 1 ? "" : "s"} queued for matching, ${duplicatePOCount} flagged Duplicate PO, ${missingPOCount} flagged Missing PO, ${skippedRowsCount} row${skippedRowsCount === 1 ? "" : "s"} skipped.`;

    console.log(`[App 1 Import] Import summary: ${summaryMsg}`);

    return {
      success: true,
      message: summaryMsg,
      importedCount,
      cleanRecordsCount,
      duplicatePOCount,
      missingPOCount,
      skippedRowsCount,
      skippedDetails,
      importedInvoices: newInvoices,
    };
  } catch (err: any) {
    console.error("[App 1 Import] Network/Server Exception:", err);
    const errorMsg = err.message || "Network error connecting to Google Sheets API endpoint.";
    return {
      success: false,
      message: errorMsg,
      importedCount: 0,
      cleanRecordsCount: 0,
      duplicatePOCount: 0,
      missingPOCount: 0,
      skippedRowsCount: 0,
      skippedDetails: [errorMsg],
      importedInvoices: [],
      error: errorMsg,
    };
  }
}
