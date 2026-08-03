import { getCachedAccessToken } from "../lib/firebase";
import { Invoice, MatchResult } from "../types";
import { resolveTabAndStatus, InvoiceSheetSyncData } from "../utils/invoiceSheetSync";

export interface SyncStatusState {
  status: "IDLE" | "SYNCING" | "SYNCED" | "ERROR";
  lastSyncedInvoice?: string;
  lastSyncedTab?: string;
  lastSyncedTime?: string;
  errorMessage?: string;
  logs?: string[];
}

const SHEET_ID_STORAGE_KEY = "ap_target_google_sheet_id";

export function getStoredSheetId(): string {
  return localStorage.getItem(SHEET_ID_STORAGE_KEY) || "";
}

export function setStoredSheetId(id: string) {
  localStorage.setItem(SHEET_ID_STORAGE_KEY, id.trim());
}

// Global listener pattern for components to subscribe to sync status
type SyncListener = (state: SyncStatusState) => void;
const listeners: Set<SyncListener> = new Set();

let currentSyncState: SyncStatusState = {
  status: "IDLE",
};

export function subscribeSyncStatus(listener: SyncListener) {
  listeners.add(listener);
  listener(currentSyncState);
  return () => {
    listeners.delete(listener);
  };
}

export function updateSyncState(newState: Partial<SyncStatusState>) {
  currentSyncState = { ...currentSyncState, ...newState };
  listeners.forEach((l) => l(currentSyncState));
}

export async function autoSyncInvoiceToSheet(
  invoice: Invoice,
  matchResult?: MatchResult | null,
  overrideStatus?: "APPROVED" | "REJECTED" | "GREEN" | "AMBER" | "RED" | "PENDING"
) {
  const sheetId = getStoredSheetId();
  const accessToken = getCachedAccessToken();

  if (!sheetId) {
    updateSyncState({
      status: "ERROR",
      errorMessage: "Target Google Sheet ID/URL not configured. Enter a Sheet ID or URL in Settings.",
    });
    console.warn("[Google Sheets Export] Skipped: Target Google Sheet ID is empty.");
    return { success: false, error: "Target Google Sheet ID not set." };
  }

  if (!accessToken) {
    updateSyncState({
      status: "ERROR",
      errorMessage: "Google Account access token missing. Click 'Sign in with Google' in header to authorize export.",
    });
    console.warn("[Google Sheets Export] Skipped: No Google OAuth access token.");
    return { success: false, error: "Google OAuth token missing." };
  }

  updateSyncState({
    status: "SYNCING",
    errorMessage: undefined,
  });

  // Determine live status & discrepancy reason explicitly
  const effectiveStatus = overrideStatus || invoice.status || (matchResult ? matchResult.overallStatus : "AMBER");
  const matchStatus = (overrideStatus === "APPROVED" || invoice.status === "APPROVED" || matchResult?.overallStatus === "GREEN")
    ? "APPROVED"
    : (matchResult ? matchResult.overallStatus : effectiveStatus);

  const discrepancyReason = matchResult?.explanations?.join(" | ") || invoice.reviewNotes || "";

  const syncItem: InvoiceSheetSyncData = {
    invoiceNumber: invoice.invoiceNumber,
    supplierName: invoice.supplierName,
    invoiceDate: invoice.invoiceDate,
    poReference: invoice.poNumber || "",
    paymentTerms: invoice.contractTerms || "Net 30",
    lineItems: (invoice.lineItems || []).map((item) => ({
      description: item.description,
      quantity: item.qty,
      unitPrice: item.unitPrice,
      lineTotal: item.total,
    })),
    subtotal: invoice.subtotal || invoice.totalAmount,
    gstAmount: invoice.gst || 0,
    totalAmount: invoice.totalAmount,
    matchStatus: (matchStatus as any) || "AMBER",
    discrepancyReason,
  };

  // Pre-validate tab and status via explicit resolveTabAndStatus
  const resolved = resolveTabAndStatus(syncItem);
  console.log(`[SheetsExport] Live resolved classification for ${invoice.invoiceNumber}:`, resolved);

  const payloadInvoiceData = {
    supplierName: invoice.supplierName,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    poNumber: invoice.poNumber,
    paymentTerms: invoice.contractTerms || "Net 30",
    lineItems: invoice.lineItems,
    subtotal: invoice.subtotal || invoice.totalAmount,
    gst: invoice.gst || 0,
    totalAmount: invoice.totalAmount,
    status: effectiveStatus,
    matchStatus: resolved.status === "Approved" ? "APPROVED" : matchStatus,
    discrepancyReason,
    syncedAt: new Date().toISOString().replace("T", " ").substring(0, 19),
  };

  try {
    console.log("[Google Sheets Export] Triggering auto-sync for:", payloadInvoiceData);
    const response = await fetch("/api/sheets/sync-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken,
        spreadsheetId: sheetId,
        invoiceData: payloadInvoiceData,
      }),
    });

    const result = await response.json();
    console.log("[Google Sheets Export] Server response:", result);

    if (!response.ok || !result.success) {
      const errorMsg = result.error || "Failed to write data to Google Sheet.";
      updateSyncState({
        status: "ERROR",
        errorMessage: errorMsg,
        logs: result.logs || [errorMsg],
      });
      return { success: false, error: errorMsg, logs: result.logs };
    }

    updateSyncState({
      status: "SYNCED",
      lastSyncedInvoice: invoice.invoiceNumber,
      lastSyncedTab: result.targetTab,
      lastSyncedTime: new Date().toLocaleTimeString(),
      errorMessage: undefined,
      logs: result.logs,
    });

    return { success: true, targetTab: result.targetTab, action: result.action };
  } catch (err: any) {
    console.error("[Google Sheets Export] Network/Server exception:", err);
    const errorMsg = err.message || "Network error connecting to Google Sheets API endpoint.";
    updateSyncState({
      status: "ERROR",
      errorMessage: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}
