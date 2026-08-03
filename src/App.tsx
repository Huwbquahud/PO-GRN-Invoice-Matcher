import React, { useState } from "react";
import { Header } from "./components/Header";
import { GoogleSheetsSyncBar } from "./components/GoogleSheetsSyncBar";
import { TestBenchBanner } from "./components/TestBenchBanner";
import { InvoiceProcessor } from "./components/InvoiceProcessor";
import { DataHub } from "./components/DataHub";
import { MatchResultsModal } from "./components/MatchResultsModal";
import { useAPStore } from "./hooks/useAPStore";
import { Invoice, MatchResult } from "./types";
import { FileText, Database, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function App() {
  const {
    purchaseOrders,
    setPurchaseOrders,
    grns,
    setGRNs,
    verifiedInvoices,
    setVerifiedInvoices,
    paymentHistory,
    setPaymentHistory,
    exceptionLogs,
    approvedPayments,
    resetAllData,
    loadBenchmarkSuite,
    runMatch,
    addBrandNewUnseenTestData,
    processDecision,
  } = useAPStore();

  const [activeMainTab, setActiveMainTab] = useState<'invoices' | 'data_hub'>('invoices');
  const [activeMatchResult, setActiveMatchResult] = useState<MatchResult | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string>("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 5000);
  };

  // Run 3-way match on selected invoice
  const handleRunMatch = (invoice: Invoice) => {
    const result = runMatch(invoice);
    setActiveMatchResult(result);
    setSelectedInvoiceId(invoice.id);
  };

  // Sample invoice shortcut from TestBenchBanner
  const handleSelectSampleInvoice = (invNum: string) => {
    // If empty or invoice not found, load benchmark suite on demand
    if (!verifiedInvoices.some((inv) => inv.invoiceNumber.toLowerCase() === invNum.toLowerCase())) {
      loadBenchmarkSuite();
      showToast(`Loading benchmark suite for Invoice #${invNum}... Select the shortcut again!`);
      return;
    }

    const target = verifiedInvoices.find(
      (inv) => inv.invoiceNumber.toLowerCase() === invNum.toLowerCase()
    );
    if (target) {
      handleRunMatch(target);
    }
  };

  const handleLoadBenchmarkWithToast = () => {
    loadBenchmarkSuite();
    showToast("Benchmark test suite loaded with sample POs, GRNs, and Invoices.");
  };

  // Add brand-new unseen PO + GRN + Invoice test
  const handleTestBrandNewData = () => {
    const { newPO, newGRN, newInvoice } = addBrandNewUnseenTestData();
    showToast(
      `Brand-new unseen record created! PO: ${newPO.poNumber}, Supplier: ${newPO.supplier}. Running 3-way match now...`
    );
    setTimeout(() => {
      handleRunMatch(newInvoice);
    }, 400);
  };

  // Handle Madam Lim decision
  const handleDecision = (
    invoice: Invoice,
    matchResult: MatchResult,
    decisionType: 'APPROVE' | 'APPROVE_WITH_NOTE' | 'REASSIGN' | 'RESOLVE_OVERRIDE' | 'REJECT',
    notes: string,
    assignedTo?: string
  ) => {
    processDecision(invoice, matchResult, decisionType, notes, assignedTo);
    showToast(
      `Decision recorded for Invoice #${invoice.invoiceNumber}. Audit log entry updated!`
    );
  };

  const handleAddInvoice = (newInv: Invoice) => {
    setVerifiedInvoices((prev) => [newInv, ...prev]);
    showToast(`Invoice #${newInv.invoiceNumber} added to Verified Invoices queue.`);
  };

  const handleDeleteInvoice = (id: string) => {
    setVerifiedInvoices((prev) => prev.filter((inv) => inv.id !== id));
    showToast("Invoice removed from queue.");
  };

  const pendingCount = verifiedInvoices.filter((i) => i.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      
      {/* Target Google Sheet Settings & Live Sync Status Bar */}
      <GoogleSheetsSyncBar />

      {/* Top Application Navigation & User Header */}
      <Header
        pendingCount={pendingCount}
        approvedCount={approvedPayments.length}
        exceptionCount={exceptionLogs.length}
        onResetData={() => {
          resetAllData();
          showToast("All documents and tables cleared.");
        }}
        onLoadBenchmarkSuite={handleLoadBenchmarkWithToast}
      />

      {/* Test Bench Banner with 1-Click Verification Shortcuts */}
      <TestBenchBanner
        onTestBrandNewData={handleTestBrandNewData}
        onSelectSampleInvoice={handleSelectSampleInvoice}
        onRunMatch={handleRunMatch}
        verifiedInvoices={verifiedInvoices}
        onLoadBenchmarkSuite={handleLoadBenchmarkWithToast}
      />

      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 w-full">
        <div className="flex border-b border-slate-200 text-xs font-medium gap-2">
          <button
            onClick={() => setActiveMainTab("invoices")}
            className={`py-3 px-5 border-b-2 font-medium flex items-center gap-2 transition ${
              activeMainTab === "invoices"
                ? "border-blue-600 text-blue-700 font-bold bg-white rounded-t-lg border-t border-x border-slate-200 shadow-sm"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            3-Way Match & Invoice Queue ({verifiedInvoices.length})
          </button>

          <button
            onClick={() => setActiveMainTab("data_hub")}
            className={`py-3 px-5 border-b-2 font-medium flex items-center gap-2 transition ${
              activeMainTab === "data_hub"
                ? "border-blue-600 text-blue-700 font-bold bg-white rounded-t-lg border-t border-x border-slate-200 shadow-sm"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Database className="w-4 h-4 text-blue-600" />
            Data Sheets Hub (POs, GRNs, Logs, Payments)
          </button>
        </div>
      </div>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full flex-1 space-y-6">
        
        {activeMainTab === "invoices" && (
          <InvoiceProcessor
            invoices={verifiedInvoices}
            onRunMatch={handleRunMatch}
            onAddInvoice={handleAddInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            selectedInvoiceId={selectedInvoiceId}
            onLoadBenchmarkSuite={handleLoadBenchmarkWithToast}
          />
        )}

        {activeMainTab === "data_hub" && (
          <DataHub
            purchaseOrders={purchaseOrders}
            setPurchaseOrders={setPurchaseOrders}
            grns={grns}
            setGRNs={setGRNs}
            verifiedInvoices={verifiedInvoices}
            paymentHistory={paymentHistory}
            setPaymentHistory={setPaymentHistory}
            exceptionLogs={exceptionLogs}
            approvedPayments={approvedPayments}
            onAddBrandNewUnseenData={handleTestBrandNewData}
            onLoadBenchmarkSuite={handleLoadBenchmarkWithToast}
          />
        )}

      </main>

      {/* 3-Way Match Decision Modal for Madam Lim */}
      <MatchResultsModal
        matchResult={activeMatchResult}
        onClose={() => setActiveMatchResult(null)}
        onDecision={handleDecision}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 mt-auto shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Three-Way Match & Exception Management Engine • SME Accounts Payable</span>
          <span className="flex items-center gap-1 text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Generic Data-Driven Matching • Audited by Madam Lim
          </span>
        </div>
      </footer>

    </div>
  );
}

