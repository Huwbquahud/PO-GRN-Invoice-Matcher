import React, { useState } from "react";
import {
  MatchResult,
  Invoice,
} from "../types";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  UserCheck,
  FileText,
  Package,
  Truck,
  Building2,
  DollarSign,
  Send,
  Lock,
  MessageSquare,
  X,
  AlertCircle,
  Clock,
  ChevronRight,
} from "lucide-react";

interface MatchResultsModalProps {
  matchResult: MatchResult | null;
  onClose: () => void;
  onDecision: (
    invoice: Invoice,
    matchResult: MatchResult,
    decisionType: 'APPROVE' | 'APPROVE_WITH_NOTE' | 'REASSIGN' | 'RESOLVE_OVERRIDE' | 'REJECT',
    notes: string,
    assignedTo?: string
  ) => void;
}

export const MatchResultsModal: React.FC<MatchResultsModalProps> = ({
  matchResult,
  onClose,
  onDecision,
}) => {
  if (!matchResult) return null;

  const {
    invoice,
    overallStatus,
    duplicateFound,
    duplicateRecord,
    poFound,
    matchedPO,
    grnFound,
    matchedGRN,
    supplierMatch,
    lineMatches,
    explanations,
    summaryTitle,
    recommendation,
  } = matchResult;

  const [activeTab, setActiveTab] = useState<'decision' | 'matrix' | 'raw'>('decision');
  const [notes, setNotes] = useState<string>("");
  const [assignedStaff, setAssignedStaff] = useState<string>("John (Warehouse)");
  const [validationError, setValidationError] = useState<string>("");

  const handleAction = (
    decisionType: 'APPROVE' | 'APPROVE_WITH_NOTE' | 'REASSIGN' | 'RESOLVE_OVERRIDE' | 'REJECT'
  ) => {
    // Enforce mandatory notes for RED override or REJECT
    if ((overallStatus === 'RED' && decisionType === 'RESOLVE_OVERRIDE') || decisionType === 'REJECT' || decisionType === 'APPROVE_WITH_NOTE') {
      if (!notes.trim()) {
        setValidationError("Mandatory comment required: Please provide a detailed reason or note for this audit trail entry.");
        return;
      }
    }

    setValidationError("");
    onDecision(invoice, matchResult, decisionType, notes, assignedStaff);
    onClose();
  };

  const getStatusBadge = (status: 'GREEN' | 'AMBER' | 'RED') => {
    switch (status) {
      case 'GREEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4" />
            GREEN — Clean Match
          </span>
        );
      case 'AMBER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-4 h-4" />
            AMBER — Review Needed
          </span>
        );
      case 'RED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-4 h-4" />
            RED — Major Discrepancy
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1115]/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#16181D] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-[#0A0B0E] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {getStatusBadge(overallStatus)}
              <span className="text-xs text-gray-400 font-mono">
                Invoice #{invoice.invoiceNumber}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-white tracking-tight">
              {summaryTitle}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Supplier: <strong className="text-gray-200">{invoice.supplierName}</strong> • PO Reference: <strong className="text-gray-200">{invoice.poNumber}</strong> • Total Amount: <strong className="text-emerald-400 font-mono">${invoice.totalAmount.toFixed(2)}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-[#0A0B0E] text-xs font-medium px-5">
          <button
            onClick={() => setActiveTab('decision')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'decision'
                ? 'border-amber-500 text-amber-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Madam Lim Decision & Explanations
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'matrix'
                ? 'border-amber-500 text-amber-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Line Item Reconciliation Matrix ({lineMatches.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {activeTab === 'decision' && (
            <div className="space-y-5">

              {/* STEP 0: Duplicate Alert Box if found */}
              {duplicateFound && duplicateRecord && (
                <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <Copy className="w-5 h-5" />
                    <span>POSSIBLE DUPLICATE INVOICE DETECTED</span>
                  </div>
                  <p className="text-xs text-rose-200/90 leading-relaxed">
                    This incoming invoice matches a record in the Payment History log. Double payment is strictly blocked until reviewed.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3 text-xs bg-slate-900/80 p-3 rounded-lg border border-rose-900/50">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-1">
                        Incoming Invoice
                      </span>
                      <p className="font-semibold text-slate-200">{invoice.supplierName}</p>
                      <p className="text-slate-300">Inv #: {invoice.invoiceNumber}</p>
                      <p className="text-slate-300">Date: {invoice.invoiceDate}</p>
                      <p className="text-emerald-400 font-semibold mt-1">
                        Amount: ${invoice.totalAmount.toFixed(2)}
                      </p>
                    </div>

                    <div className="border-t sm:border-t-0 sm:border-l border-rose-900/50 pt-2 sm:pt-0 sm:pl-3">
                      <span className="text-rose-400 block text-[10px] uppercase tracking-wider mb-1 font-bold">
                        Matching Payment Record
                      </span>
                      <p className="font-semibold text-slate-200">{duplicateRecord.supplier}</p>
                      <p className="text-slate-300">Paid Inv #: {duplicateRecord.invoiceNumber}</p>
                      <p className="text-slate-300">Date Paid: {duplicateRecord.date}</p>
                      <p className="text-rose-400 font-semibold mt-1">
                        Paid Amount: ${duplicateRecord.amount.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Ref: {duplicateRecord.paymentReference || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Plain Language Explanations Box */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  Plain Language Discrepancy Breakdown (For Madam Lim)
                </h4>

                {explanations.length === 0 ? (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>No discrepancies found! All purchase order quantities, unit prices, goods received notes, and total math match cleanly.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {explanations.map((exp, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg text-xs leading-relaxed border ${
                          exp.startsWith("GREEN")
                            ? "bg-emerald-950/20 border-emerald-800/30 text-emerald-300"
                            : exp.startsWith("AMBER")
                            ? "bg-amber-950/20 border-amber-800/30 text-amber-300"
                            : "bg-rose-950/20 border-rose-800/30 text-rose-300 font-medium"
                        }`}
                      >
                        {exp}
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block mb-0.5">Recommended Action:</span>
                    <span>{recommendation}</span>
                  </div>
                </div>
              </div>

              {/* 3-Way Reference Side-by-Side Cards */}
              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                {/* Card 1: Invoice */}
                <div className="bg-slate-800/40 border border-slate-700/80 p-3 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
                    <FileText className="w-4 h-4 text-sky-400" />
                    Invoice Header
                  </div>
                  <p className="font-bold text-slate-100">{invoice.invoiceNumber}</p>
                  <p className="text-slate-300 text-[11px]">{invoice.supplierName}</p>
                  <p className="text-slate-400 text-[10px]">PO Ref: {invoice.poNumber}</p>
                  {invoice.contractNumber && (
                    <p className="text-amber-300 text-[10px] font-mono">
                      Contract Ref: {invoice.contractNumber} {invoice.contractTerms ? `(${invoice.contractTerms})` : ""}
                    </p>
                  )}
                  <p className="text-emerald-400 font-bold text-sm pt-1">
                    Total: ${invoice.totalAmount.toFixed(2)}
                  </p>
                </div>

                {/* Card 2: Purchase Order */}
                <div className="bg-slate-800/40 border border-slate-700/80 p-3 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
                    <Package className="w-4 h-4 text-amber-400" />
                    Purchase Order (PO)
                  </div>
                  {poFound && matchedPO ? (
                    <>
                      <p className="font-bold text-slate-100">{matchedPO.poNumber}</p>
                      <p className="text-slate-300 text-[11px]">{matchedPO.supplier}</p>
                      <p className="text-slate-400 text-[10px]">Ordered: {matchedPO.qtyOrdered} units @ ${matchedPO.unitPrice.toFixed(2)}</p>
                      <p className="text-amber-400 font-bold text-sm pt-1">
                        PO Total: ${matchedPO.totalAmount.toFixed(2)}
                      </p>
                    </>
                  ) : (
                    <div className="text-rose-400 text-xs italic py-2">
                      No PO Record Found
                    </div>
                  )}
                </div>

                {/* Card 3: Goods Received Note */}
                <div className="bg-slate-800/40 border border-slate-700/80 p-3 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
                    <Truck className="w-4 h-4 text-emerald-400" />
                    Goods Received (GRN)
                  </div>
                  {grnFound && matchedGRN ? (
                    <>
                      <p className="font-bold text-slate-100">{matchedGRN.grnNumber}</p>
                      <p className="text-slate-300 text-[11px]">Rec'd By: {matchedGRN.receivedBy}</p>
                      <p className="text-slate-400 text-[10px]">Qty Rec'd: {matchedGRN.qtyReceived} units</p>
                      <p className={`font-semibold text-xs pt-1 ${
                        matchedGRN.condition.toLowerCase() === "good" ? "text-emerald-400" : "text-amber-400 font-bold"
                      }`}>
                        Condition: {matchedGRN.condition}
                      </p>
                    </>
                  ) : (
                    <div className="text-rose-400 text-xs italic py-2">
                      No GRN Record Logged Yet
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 6: Decision Form for Madam Lim */}
              <div className="border-t border-slate-800 pt-4 space-y-4">
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Madam Lim Review & Sign-Off Desk
                </h4>

                {/* Notes Input Field */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Reviewer Notes / Mandated Audit Comments
                    {(overallStatus === 'RED' || overallStatus === 'AMBER') && (
                      <span className="text-amber-400 ml-1">* (Required for Exception Audit Trail)</span>
                    )}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter audit rationale, discount terms, or instructions for Procurement..."
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  {validationError && (
                    <p className="text-xs text-rose-400 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {validationError}
                    </p>
                  )}
                </div>

                {/* Staff Assignment Select (For Amber Reassign option) */}
                {overallStatus === 'AMBER' && (
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-2">
                    <label className="block text-xs font-medium text-slate-300">
                      Reassign / Route Discrepancy To Staff:
                    </label>
                    <select
                      value={assignedStaff}
                      onChange={(e) => setAssignedStaff(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 w-full"
                    >
                      <option value="John (Warehouse Supervisor)">John (Warehouse Supervisor)</option>
                      <option value="Ahmad (Receiving Dock)">Ahmad (Receiving Dock)</option>
                      <option value="Sarah (Procurement Officer)">Sarah (Procurement Officer)</option>
                      <option value="David (Finance Lead)">David (Finance Lead)</option>
                    </select>
                  </div>
                )}

                {/* Action Buttons based on Status */}
                <div className="flex flex-wrap gap-2 pt-1">
                  
                  {/* GREEN STATUS BUTTONS */}
                  {overallStatus === 'GREEN' && (
                    <button
                      onClick={() => handleAction('APPROVE')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition flex items-center gap-2 shadow-lg shadow-emerald-950/40"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Route to Payment Tab
                    </button>
                  )}

                  {/* AMBER STATUS BUTTONS */}
                  {overallStatus === 'AMBER' && (
                    <>
                      <button
                        onClick={() => handleAction('APPROVE_WITH_NOTE')}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve with Note
                      </button>

                      <button
                        onClick={() => handleAction('REASSIGN')}
                        className="bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Route to {assignedStaff}
                      </button>
                    </>
                  )}

                  {/* RED STATUS BUTTONS */}
                  {overallStatus === 'RED' && (
                    <>
                      <button
                        onClick={() => handleAction('RESOLVE_OVERRIDE')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Manually Resolve & Authorize Override
                      </button>

                      <button
                        onClick={() => handleAction('REJECT')}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition flex items-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        Block Payment & Log Exception
                      </button>
                    </>
                  )}

                  <button
                    onClick={onClose}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs px-4 py-2.5 rounded-lg transition ml-auto"
                  >
                    Close / Review Later
                  </button>

                </div>
              </div>

            </div>
          )}

          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-medium uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">PO Qty</th>
                      <th className="py-2.5 px-3">GRN Qty</th>
                      <th className="py-2.5 px-3">Billed Qty</th>
                      <th className="py-2.5 px-3">PO Price</th>
                      <th className="py-2.5 px-3">Billed Price</th>
                      <th className="py-2.5 px-3">GRN Condition</th>
                      <th className="py-2.5 px-3">Status & Variance Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {lineMatches.map((line) => (
                      <tr key={line.lineIndex} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{line.lineIndex}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-200">{line.itemDescription}</td>
                        <td className="py-2.5 px-3 text-slate-300 font-mono">{line.qtyOrdered}</td>
                        <td className="py-2.5 px-3 text-slate-300 font-mono">{line.qtyReceived}</td>
                        <td className={`py-2.5 px-3 font-mono font-bold ${
                          line.qtyBilled > line.qtyReceived ? "text-amber-400" : "text-slate-200"
                        }`}>
                          {line.qtyBilled}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-mono">${line.unitPricePO.toFixed(2)}</td>
                        <td className={`py-2.5 px-3 font-mono ${
                          line.unitPriceBilled > line.unitPricePO ? "text-amber-400 font-bold" : "text-slate-200"
                        }`}>
                          ${line.unitPriceBilled.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            line.condition.toLowerCase() === "good" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {line.condition}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] leading-snug">
                          <span className={`font-semibold mr-1 ${
                            line.status === 'GREEN' ? 'text-emerald-400' : line.status === 'AMBER' ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            [{line.status}]
                          </span>
                          <span className="text-slate-300">{line.issue}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
