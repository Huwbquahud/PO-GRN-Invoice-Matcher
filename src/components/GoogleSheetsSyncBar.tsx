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
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Shield,
  UserCheck,
  LogOut,
  X,
} from "lucide-react";

export const GoogleSheetsSyncBar: React.FC = () => {
  const [sheetInput, setSheetInput] = useState<string>(() => getStoredSheetId());
  const [syncState, setSyncState] = useState<SyncStatusState>({ status: "IDLE" });
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);

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

  // Helper to get clean sheet URL for quick opening
  const rawId = sheetInput.trim();
  const cleanId = rawId.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] || rawId;
  const sheetUrl = cleanId ? `https://docs.google.com/spreadsheets/d/${cleanId}/edit` : null;

  return (
    <div className="bg-slate-900 text-slate-100 py-2 px-4 text-xs shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        
        {/* Left Side: Settings Input for Google Sheet ID/URL */}
        <div className="flex items-center flex-wrap gap-2.5 flex-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-white">Live Sheet Export:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-1 min-w-[280px] max-w-xl">
            <input
              type="text"
              value={sheetInput}
              onChange={handleSheetIdChange}
              placeholder="Target Google Sheet ID or URL (e.g. 1ABC123... or https://docs.google.com/...)"
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
                <span>Open Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
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
                className="text-slate-400 hover:text-rose-400 transition ml-1"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              disabled={isSigningIn}
              className="gsi-material-button bg-white hover:bg-slate-100 text-slate-800 font-semibold px-2.5 py-1 rounded-md text-xs border border-slate-300 flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
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
