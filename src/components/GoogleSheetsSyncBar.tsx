import React, { useState, useEffect } from "react";
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  getCachedAccessToken,
} from "../lib/firebase";
import {
  getStoredSheetId,
  setStoredSheetId,
  subscribeSyncStatus,
  SyncStatusState,
} from "../services/sheetsExport";
import {
  getApp1StoredSheetId,
  setApp1StoredSheetId,
  getApp1StoredTabName,
  setApp1StoredTabName,
  importApp1InvoicesBulk,
  ImportApp1Summary,
} from "../services/app1Import";
import { Invoice, PurchaseOrder, GoodsReceivedNote, PaymentRecord } from "../types";
import {
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Shield,
  UserCheck,
  LogOut,
  X,
  Download,
  DownloadCloud,
} from "lucide-react";

interface GoogleSheetsSyncBarProps {
  verifiedInvoices?: Invoice[];
  onImportApp1Batch?: (invoices: Invoice[], summaryMessage: string) => void;
  purchaseOrders?: PurchaseOrder[];
  grns?: GoodsReceivedNote[];
  paymentHistory?: PaymentRecord[];
}

export const GoogleSheetsSyncBar: React.FC<GoogleSheetsSyncBarProps> = ({
  verifiedInvoices = [],
  onImportApp1Batch,
  purchaseOrders = [],
  grns = [],
  paymentHistory = [],
}) => {
  const [sheetInput, setSheetInput] = useState<string>(() => getStoredSheetId());
  const [app1SheetInput, setApp1SheetInput] = useState<string>(() => getApp1StoredSheetId());
  const [app1TabInput, setApp1TabInput] = useState<string>(() => getApp1StoredTabName());
  
  const [syncState, setSyncState] = useState<SyncStatusState>({ status: "IDLE" });
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);

  // App 1 Import state
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSummaryModal, setImportSummaryModal] = useState<ImportApp1Summary | null>(null);

  useEffect(() => {
    // Subscribe to Firebase Auth state
    const unsubscribeAuth = initAuth(
      (user, token) => {
        setIsAuthenticated(true);
        setUserEmail(user.email);
      },
      () => {
        setIsAuthenticated(false);
        setUserEmail(null);
      }
    );

    // Subscribe to Google Sheets sync state
    const unsubscribeSync = subscribeSyncStatus((state) => {
      setSyncState(state);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSync();
    };
  }, []);

  const handleSheetIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSheetInput(val);
    setStoredSheetId(val);
  };

  const handleApp1SheetIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApp1SheetInput(val);
    setApp1StoredSheetId(val);
  };

  const handleApp1TabNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApp1TabInput(val);
    setApp1StoredTabName(val);
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setIsAuthenticated(true);
        setUserEmail(res.user.email);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      alert("Google Sign-In failed: " + (err.message || err));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await googleSignOut();
    setIsAuthenticated(false);
    setUserEmail(null);
  };

  // Helper to trigger App 1 single bulk read
  const handleTriggerApp1Import = async () => {
    if (!isAuthenticated && !getCachedAccessToken()) {
      alert("Please click 'Sign in with Google' first to authorize Google Sheets API import.");
      return;
    }

    const sourceId = app1SheetInput.trim() || sheetInput.trim();
    if (!sourceId) {
      alert("Please enter the App 1 Source Google Sheet ID or URL.");
      return;
    }

    setIsImporting(true);
    try {
      const summary = await importApp1InvoicesBulk(
        verifiedInvoices,
        purchaseOrders,
        grns,
        paymentHistory,
        sourceId
      );

      if (summary.success && summary.importedInvoices.length > 0 && onImportApp1Batch) {
        onImportApp1Batch(summary.importedInvoices, summary.message);
      }

      setImportSummaryModal(summary);
    } catch (err: any) {
      console.error("Import trigger failed:", err);
      alert("Failed to import invoices from App 1: " + (err.message || err));
    } finally {
      setIsImporting(false);
    }
  };

  // Helper to get clean sheet URL for quick opening
  const rawId = sheetInput.trim();
  const cleanId = rawId.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] || rawId;
  const sheetUrl = cleanId ? `https://docs.google.com/spreadsheets/d/${cleanId}/edit` : null;

  return (
    <div className="bg-slate-900 text-slate-100 py-2 px-4 text-xs shadow-md border-b border-slate-800 space-y-2">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        
        {/* Left Side: Settings Inputs */}
        <div className="flex items-center flex-wrap gap-2.5 flex-1">
          {/* Target Sheet Export */}
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-white">Target Export Sheet:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-1 min-w-[220px] max-w-sm">
            <input
              type="text"
              value={sheetInput}
              onChange={handleSheetIdChange}
              placeholder="Target Sheet ID / URL"
              className="w-full bg-slate-800 text-slate-100 placeholder-slate-400 border border-slate-700 rounded-md px-2.5 py-1 text-xs font-mono focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                title="Open Live Google Sheet in new tab"
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 p-1.5 rounded-md border border-slate-700 transition shrink-0 flex items-center gap-1 font-sans text-[11px]"
              >
                <span>Open</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* App 1 Source Sheet Setting */}
          <div className="flex items-center gap-1.5 text-sky-400 font-medium shrink-0 ml-2 border-l border-slate-800 pl-3">
            <DownloadCloud className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-white">App 1 Source Sheet:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-1 min-w-[220px] max-w-sm">
            <input
              type="text"
              value={app1SheetInput}
              onChange={handleApp1SheetIdChange}
              placeholder="App 1 Source Sheet ID / URL"
              className="w-full bg-slate-800 text-slate-100 placeholder-slate-400 border border-slate-700 rounded-md px-2.5 py-1 text-xs font-mono focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Import Button */}
          <button
            onClick={handleTriggerApp1Import}
            disabled={isImporting}
            className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-3 py-1 rounded-md text-xs flex items-center gap-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Reading Sheet...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Import All Invoices from App 1</span>
              </>
            )}
          </button>
        </div>

        {/* Right Side: Google Auth & Live Sync Status Indicator */}
        <div className="flex items-center flex-wrap gap-3 shrink-0">
          
          {/* Status Indicator Badge */}
          <div className="flex items-center">
            {syncState.status === "SYNCING" && (
              <span className="bg-amber-950/80 text-amber-300 border border-amber-600/60 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                <span>Syncing...</span>
              </span>
            )}

            {syncState.status === "SYNCED" && (
              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Synced ({syncState.lastSyncedTab} #{syncState.lastSyncedInvoice})
                </span>
              </span>
            )}

            {syncState.status === "ERROR" && (
              <button
                onClick={() => setShowErrorModal(true)}
                className="bg-rose-950/90 hover:bg-rose-900 text-rose-200 border border-rose-600 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 transition text-xs cursor-pointer shadow-xs"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate max-w-[200px]">Sync failed — see error</span>
              </button>
            )}

            {syncState.status === "IDLE" && (
              <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-slate-400" />
                <span>Auto-Export Active</span>
              </span>
            )}
          </div>

          {/* Google Auth Control */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md text-[11px]">
              <UserCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-300 truncate max-w-[130px] font-mono">{userEmail}</span>
              <button
                onClick={handleLogout}
                title="Sign out of Google"
                className="text-slate-400 hover:text-rose-400 transition ml-1 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              disabled={isSigningIn}
              className="gsi-material-button bg-white hover:bg-slate-100 text-slate-800 font-semibold px-2.5 py-1 rounded-md text-xs border border-slate-300 flex items-center gap-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isSigningIn ? "Signing in..." : "Sign in with Google"}</span>
            </button>
          )}

        </div>

      </div>

      {/* App 1 Import Summary Modal */}
      {importSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 text-slate-900">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-sky-700 font-bold text-sm">
                <Download className="w-5 h-5 text-sky-600" />
                <span>App 1 Bulk Import Results</span>
              </div>
              <button
                onClick={() => setImportSummaryModal(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className={`p-3.5 rounded-lg font-medium border ${
                importSummaryModal.success 
                  ? "bg-sky-50 border-sky-200 text-sky-900" 
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}>
                {importSummaryModal.message}
              </div>

              {importSummaryModal.skippedDetails && importSummaryModal.skippedDetails.length > 0 && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Skipped / Malformed Rows Details ({importSummaryModal.skippedRowsCount}):
                  </label>
                  <ul className="bg-slate-50 border border-slate-200 p-3 rounded-lg font-mono text-[11px] max-h-36 overflow-y-auto space-y-1 text-slate-700">
                    {importSummaryModal.skippedDetails.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-slate-500 text-[11px]">
                Note: Invoices were fetched via a single bulk Google Sheets API request for tab <strong className="font-mono text-slate-700">Verified Invoices</strong>. Clean Records undergo standard 3-way matching, while Duplicate/Missing POs are pre-classified directly as RED.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setImportSummaryModal(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-semibold text-xs transition cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-xl shadow-2xl max-w-lg w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>Google Sheets Sync Failure</span>
              </div>
              <button
                onClick={() => setShowErrorModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-rose-800 font-medium font-mono">
                {syncState.errorMessage || "Unknown Google Sheets API error occurred."}
              </div>

              {syncState.logs && syncState.logs.length > 0 && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Execution Log Trace:</label>
                  <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {syncState.logs.join("\n")}
                  </pre>
                </div>
              )}

              <p className="text-slate-500">
                Troubleshooting tips:
                <br />1. Make sure your Google Account is signed in.
                <br />2. Verify that the Google Sheet ID or URL is correct.
                <br />3. Ensure your Google account has Editor edit permissions on the target sheet.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowErrorModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-semibold text-xs"
              >
                Close Trace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
