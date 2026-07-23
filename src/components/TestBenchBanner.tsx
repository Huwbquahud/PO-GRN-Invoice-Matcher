import React from "react";
import {
  Sparkles,
  Zap,
  CheckCircle,
  AlertTriangle,
  Copy,
  UserX,
  FileQuestion,
  ArrowRight,
} from "lucide-react";
import { Invoice } from "../types";

interface TestBenchBannerProps {
  onTestBrandNewData: () => void;
  onSelectSampleInvoice: (invNumber: string) => void;
  onRunMatch: (invoice: Invoice) => void;
  verifiedInvoices: Invoice[];
  onLoadBenchmarkSuite: () => void;
}

export const TestBenchBanner: React.FC<TestBenchBannerProps> = ({
  onTestBrandNewData,
  onSelectSampleInvoice,
  onRunMatch,
  verifiedInvoices,
  onLoadBenchmarkSuite,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-6 shadow-xs">
      <div className="max-w-7xl mx-auto">
        
        {/* Banner Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-blue-50 text-blue-600 border border-blue-200 p-1.5 rounded-lg shrink-0">
              <Zap className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
                Verification Shortcuts & Test Scenarios
              </h2>
              <p className="text-xs text-slate-500">
                Execute 3-way matching across test classifications (Green clean match, Amber discrepancies, Red blocks) & custom records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {verifiedInvoices.length === 0 && (
              <button
                onClick={onLoadBenchmarkSuite}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Load Benchmark Suite</span>
              </button>
            )}

            <button
              onClick={onTestBrandNewData}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-100" />
              <span>Generate & Match Unseen Test Document</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Shortcut Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          
          {/* Button 1: Clean Match */}
          <button
            onClick={() => onSelectSampleInvoice("INV-2026-001")}
            className="bg-slate-50 hover:bg-emerald-50 text-slate-800 p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 transition text-left flex flex-col justify-between group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono font-bold text-emerald-700 group-hover:underline">INV-2026-001</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-[10px] text-slate-500 truncate">Clean Match (GREEN)</span>
          </button>

          {/* Button 2: Shortfall */}
          <button
            onClick={() => onSelectSampleInvoice("INV-2026-003")}
            className="bg-slate-50 hover:bg-amber-50 text-slate-800 p-2.5 rounded-lg border border-slate-200 hover:border-amber-300 transition text-left flex flex-col justify-between group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono font-bold text-amber-700 group-hover:underline">INV-2026-003</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-[10px] text-slate-500 truncate">Qty Shortfall (AMBER)</span>
          </button>

          {/* Button 3: Damaged */}
          <button
            onClick={() => onSelectSampleInvoice("INV-2026-004")}
            className="bg-slate-50 hover:bg-amber-50 text-slate-800 p-2.5 rounded-lg border border-slate-200 hover:border-amber-300 transition text-left flex flex-col justify-between group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono font-bold text-amber-700 group-hover:underline">INV-2026-004</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-[10px] text-slate-500 truncate">Damaged Goods (AMBER)</span>
          </button>

          {/* Button 4: Duplicate */}
          <button
            onClick={() => onSelectSampleInvoice("INV-8821")}
            className="bg-slate-50 hover:bg-rose-50 text-slate-800 p-2.5 rounded-lg border border-slate-200 hover:border-rose-300 transition text-left flex flex-col justify-between group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono font-bold text-rose-700 group-hover:underline">INV-8821</span>
              <Copy className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <span className="text-[10px] text-slate-500 truncate">Duplicate Invoice (RED)</span>
          </button>

          {/* Button 5: Supplier Mismatch */}
          <button
            onClick={() => onSelectSampleInvoice("INV-2026-006")}
            className="bg-slate-50 hover:bg-rose-50 text-slate-800 p-2.5 rounded-lg border border-slate-200 hover:border-rose-300 transition text-left flex flex-col justify-between group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono font-bold text-rose-700 group-hover:underline">INV-2026-006</span>
              <UserX className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <span className="text-[10px] text-slate-500 truncate">Supplier Mismatch (RED)</span>
          </button>

          {/* Button 6: Missing GRN */}
          <button
            onClick={() => onSelectSampleInvoice("INV-2026-005")}
            className="bg-slate-50 hover:bg-rose-50 text-slate-800 p-2.5 rounded-lg border border-slate-200 hover:border-rose-300 transition text-left flex flex-col justify-between group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono font-bold text-rose-700 group-hover:underline">INV-2026-005</span>
              <FileQuestion className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <span className="text-[10px] text-slate-500 truncate">Missing GRN (RED)</span>
          </button>

        </div>

      </div>
    </div>
  );
};

