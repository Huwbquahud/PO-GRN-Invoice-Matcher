import React from "react";
import { ShieldCheck, AlertTriangle, FileSpreadsheet, CheckCircle2, UserCheck, RefreshCw, Trash2, Layers } from "lucide-react";

interface HeaderProps {
  pendingCount: number;
  approvedCount: number;
  exceptionCount: number;
  onResetData: () => void;
  onLoadBenchmarkSuite: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pendingCount,
  approvedCount,
  exceptionCount,
  onResetData,
  onLoadBenchmarkSuite,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Title & Brand */}
          <div className="flex items-center gap-3.5">
            <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-blue-600 shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif font-bold tracking-tight text-slate-900">
                  Three-Way Match & Exception Management
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  AP Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-sans">
                Accounts Payable Portal • Invoice Extraction, PO Reconciliation & Exception Logging
              </p>
            </div>
          </div>

          {/* User Role Badge & Stats */}
          <div className="flex items-center flex-wrap gap-3">
            {/* User Profile */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 shadow-xs">
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-mono tracking-wider">Reviewer</span>
                <span className="font-semibold text-slate-800">Madam Lim (AP Lead)</span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Pending: {pendingCount}
              </span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Approved: {approvedCount}
              </span>
              <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                Logs: {exceptionCount}
              </span>
            </div>

            {/* Load Benchmark Suite or Clear All */}
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <button
                onClick={onLoadBenchmarkSuite}
                title="Load sample benchmark documents for testing"
                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded-lg border border-blue-200 transition font-medium flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Load Samples
              </button>
              <button
                onClick={onResetData}
                title="Clear all documents from the app"
                className="text-xs bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 transition font-medium flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

