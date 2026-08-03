import { useState, useEffect } from "react";
import {
  PurchaseOrder,
  GoodsReceivedNote,
  Invoice,
  PaymentRecord,
  ExceptionLogEntry,
  ApprovedPaymentRecord,
  MatchResult,
} from "../types";
import {
  initialPurchaseOrders,
  initialGRNs,
  initialPaymentHistory,
  initialVerifiedInvoices,
  initialExceptionLog,
  initialApprovedPayments,
  benchmarkSamplePOs,
  benchmarkSampleGRNs,
  benchmarkSampleInvoices,
} from "../data/seedData";
import { performThreeWayMatch } from "../utils/matchingEngine";
import { autoSyncInvoiceToSheet } from "../services/sheetsExport";

const STORAGE_KEYS = {
  POS: "ap_3way_purchase_orders_v_clean_1",
  GRNS: "ap_3way_grns_v_clean_1",
  INVOICES: "ap_3way_invoices_v_clean_1",
  PAYMENTS: "ap_3way_payment_history_v_clean_1",
  EXCEPTIONS: "ap_3way_exception_log_v_clean_1",
  APPROVED: "ap_3way_approved_payments_v_clean_1",
};

export function useAPStore() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.POS);
    return saved ? JSON.parse(saved) : initialPurchaseOrders;
  });

  const [grns, setGRNs] = useState<GoodsReceivedNote[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GRNS);
    return saved ? JSON.parse(saved) : initialGRNs;
  });

  const [verifiedInvoices, setVerifiedInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return saved ? JSON.parse(saved) : initialVerifiedInvoices;
  });

  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return saved ? JSON.parse(saved) : initialPaymentHistory;
  });

  const [exceptionLogs, setExceptionLogs] = useState<ExceptionLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXCEPTIONS);
    return saved ? JSON.parse(saved) : initialExceptionLog;
  });

  const [approvedPayments, setApprovedPayments] = useState<ApprovedPaymentRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.APPROVED);
    return saved ? JSON.parse(saved) : initialApprovedPayments;
  });

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POS, JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GRNS, JSON.stringify(grns));
  }, [grns]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(verifiedInvoices));
  }, [verifiedInvoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(paymentHistory));
  }, [paymentHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXCEPTIONS, JSON.stringify(exceptionLogs));
  }, [exceptionLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APPROVED, JSON.stringify(approvedPayments));
  }, [approvedPayments]);

  // Reset to clean empty state
  const resetAllData = () => {
    setPurchaseOrders([]);
    setGRNs([]);
    setVerifiedInvoices([]);
    setPaymentHistory([]);
    setExceptionLogs([]);
    setApprovedPayments([]);
  };

  // Populate benchmark test suite on demand
  const loadBenchmarkSuite = () => {
    setPurchaseOrders(benchmarkSamplePOs);
    setGRNs(benchmarkSampleGRNs);
    setVerifiedInvoices(benchmarkSampleInvoices);
  };

  // Run match for any given invoice
  const runMatch = (invoice: Invoice): MatchResult => {
    const result = performThreeWayMatch(
      invoice,
      purchaseOrders,
      grns,
      paymentHistory
    );

    // AUTOMATIC EXPORT: Trigger Google Sheet auto-export on classification
    autoSyncInvoiceToSheet(invoice, result);

    return result;
  };

  // Add Brand New Unseen PO + GRN + Invoice test
  const addBrandNewUnseenTestData = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newPONum = `PO-APEX-${randomSuffix}`;
    const newGRNNum = `GRN-APEX-${randomSuffix}`;
    const newInvNum = `INV-APEX-${randomSuffix}`;
    const today = new Date().toISOString().split("T")[0];

    const newPO: PurchaseOrder = {
      id: `po-apex-${randomSuffix}`,
      poNumber: newPONum,
      poDate: today,
      supplier: "Apex Industrial Dynamics",
      itemDescription: "Hydraulic Pressure Gauge 0-5000 PSI",
      qtyOrdered: 25,
      unitPrice: 85.0,
      totalAmount: 2125.0,
      expectedDeliveryDate: today,
    };

    const newGRN: GoodsReceivedNote = {
      id: `grn-apex-${randomSuffix}`,
      grnNumber: newGRNNum,
      grnDate: today,
      poNumber: newPONum,
      supplier: "Apex Industrial Dynamics",
      itemDescription: "Hydraulic Pressure Gauge 0-5000 PSI",
      qtyOrdered: 25,
      qtyReceived: 25,
      condition: "Good",
      receivedBy: "John (Warehouse)",
    };

    const newInvoice: Invoice = {
      id: `inv-apex-${randomSuffix}`,
      invoiceNumber: newInvNum,
      invoiceDate: today,
      supplierName: "Apex Industrial Dynamics",
      poNumber: newPONum,
      lineItems: [
        {
          description: "Hydraulic Pressure Gauge 0-5000 PSI",
          qty: 25,
          unitPrice: 85.0,
          total: 2125.0,
        },
      ],
      totalAmount: 2125.0,
      status: "PENDING",
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);
    setGRNs((prev) => [newGRN, ...prev]);
    setVerifiedInvoices((prev) => [newInvoice, ...prev]);

    return { newPO, newGRN, newInvoice };
  };

  // Human Decision Handler (Madam Lim's Desk)
  const processDecision = (
    invoice: Invoice,
    matchResult: MatchResult,
    decisionType: 'APPROVE' | 'APPROVE_WITH_NOTE' | 'REASSIGN' | 'RESOLVE_OVERRIDE' | 'REJECT',
    notes: string,
    assignedTo?: string
  ) => {
    const now = new Date();
    const timestamp = now.toISOString().replace("T", " ").substring(0, 16);
    const todayStr = now.toISOString().split("T")[0];

    let actionLabel = "";
    let newInvoiceStatus: 'APPROVED' | 'REJECTED' | 'PENDING' = 'APPROVED';

    switch (decisionType) {
      case 'APPROVE':
        actionLabel = "Approved for Payment (Clean Sign-off)";
        newInvoiceStatus = "APPROVED";
        break;
      case 'APPROVE_WITH_NOTE':
        actionLabel = "Approved with Note";
        newInvoiceStatus = "APPROVED";
        break;
      case 'REASSIGN':
        actionLabel = `Reassigned / Routed to ${assignedTo || "Procurement Staff"}`;
        newInvoiceStatus = "PENDING";
        break;
      case 'RESOLVE_OVERRIDE':
        actionLabel = "Manually Resolved & Overridden with Mandatory Audit Trail";
        newInvoiceStatus = "APPROVED";
        break;
      case 'REJECT':
        actionLabel = "Rejected / Payment Blocked";
        newInvoiceStatus = "REJECTED";
        break;
    }

    // 1. Log in Exception Log tab
    const newLogEntry: ExceptionLogEntry = {
      id: `ex-${Date.now()}`,
      timestamp,
      invoiceNumber: invoice.invoiceNumber,
      supplier: invoice.supplierName,
      poNumber: invoice.poNumber,
      status: matchResult.overallStatus,
      reviewer: "Madam Lim",
      action: actionLabel,
      notes: notes || "No additional comments.",
    };

    setExceptionLogs((prev) => [newLogEntry, ...prev]);

    // 2. Update Invoice status
    const updatedInvoice: Invoice = {
      ...invoice,
      status: newInvoiceStatus,
      reviewNotes: notes,
      reviewedBy: "Madam Lim",
      reviewedAt: timestamp,
    };

    setVerifiedInvoices((prev) =>
      prev.map((inv) => (inv.id === invoice.id ? updatedInvoice : inv))
    );

    // AUTOMATIC EXPORT: Trigger Google Sheet auto-export on decision change (moves invoice between tabs if needed)
    const effectiveMatchStatus = newInvoiceStatus === "APPROVED" ? "Approved" : newInvoiceStatus === "REJECTED" ? "Red" : matchResult.overallStatus;
    autoSyncInvoiceToSheet(
      updatedInvoice,
      { ...matchResult, overallStatus: effectiveMatchStatus as any },
      newInvoiceStatus
    );

    // 3. If Approved, add to "Approved for Payment" tab AND update Payment History (for duplicate detection!)
    if (newInvoiceStatus === "APPROVED") {
      const approvedRecord: ApprovedPaymentRecord = {
        id: `app-${Date.now()}`,
        approvedDate: todayStr,
        invoiceNumber: invoice.invoiceNumber,
        supplier: invoice.supplierName,
        poNumber: invoice.poNumber,
        amount: invoice.totalAmount,
        approvedBy: "Madam Lim",
        notes: notes || actionLabel,
      };

      setApprovedPayments((prev) => [approvedRecord, ...prev]);

      // Update Payment History log so subsequent identical invoices trigger Step 0 duplicate detection
      const newPaymentHistoryItem: PaymentRecord = {
        id: `pay-${Date.now()}`,
        supplier: invoice.supplierName,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount,
        date: todayStr,
        paymentReference: `APPROVED-LIM-${Math.floor(1000 + Math.random() * 9000)}`,
      };

      setPaymentHistory((prev) => [newPaymentHistoryItem, ...prev]);
    }
  };

  return {
    purchaseOrders,
    setPurchaseOrders,
    grns,
    setGRNs,
    verifiedInvoices,
    setVerifiedInvoices,
    paymentHistory,
    setPaymentHistory,
    exceptionLogs,
    setExceptionLogs,
    approvedPayments,
    setApprovedPayments,
    resetAllData,
    loadBenchmarkSuite,
    runMatch,
    addBrandNewUnseenTestData,
    processDecision,
  };
}
