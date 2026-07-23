import React, { useState } from "react";
import {
  PurchaseOrder,
  GoodsReceivedNote,
  Invoice,
  PaymentRecord,
  ExceptionLogEntry,
  ApprovedPaymentRecord,
} from "../types";
import {
  FileSpreadsheet,
  Package,
  Truck,
  History,
  ShieldAlert,
  CheckCircle2,
  Plus,
  Trash2,
  Download,
  Search,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
  FileText,
} from "lucide-react";

interface DataHubProps {
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  grns: GoodsReceivedNote[];
  setGRNs: React.Dispatch<React.SetStateAction<GoodsReceivedNote[]>>;
  verifiedInvoices: Invoice[];
  paymentHistory: PaymentRecord[];
  setPaymentHistory: React.Dispatch<React.SetStateAction<PaymentRecord[]>>;
  exceptionLogs: ExceptionLogEntry[];
  approvedPayments: ApprovedPaymentRecord[];
  onAddBrandNewUnseenData: () => void;
  onLoadBenchmarkSuite?: () => void;
}

export const DataHub: React.FC<DataHubProps> = ({
  purchaseOrders,
  setPurchaseOrders,
  grns,
  setGRNs,
  verifiedInvoices,
  paymentHistory,
  setPaymentHistory,
  exceptionLogs,
  approvedPayments,
  onAddBrandNewUnseenData,
  onLoadBenchmarkSuite,
}) => {
  const [activeSheetTab, setActiveSheetTab] = useState<
    'po' | 'grn' | 'verified' | 'payments' | 'exceptions' | 'approved'
  >('po');

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSubTab, setModalSubTab] = useState<'ai' | 'manual'>('ai');

  // New PO Form
  const [newPONum, setNewPONum] = useState("");
  const [newPODate, setNewPODate] = useState(new Date().toISOString().split("T")[0]);
  const [newPOSupplier, setNewPOSupplier] = useState("");
  const [newPOItem, setNewPOItem] = useState("");
  const [newPOQty, setNewPOQty] = useState(10);
  const [newPOUnitPrice, setNewPOUnitPrice] = useState(10);
  const [newPOExpectedDate, setNewPOExpectedDate] = useState(new Date().toISOString().split("T")[0]);

  // New GRN Form
  const [newGRNNum, setNewGRNNum] = useState("");
  const [newGRNDate, setNewGRNDate] = useState(new Date().toISOString().split("T")[0]);
  const [newGRNPONum, setNewGRNPONum] = useState("");
  const [newGRNSupplier, setNewGRNSupplier] = useState("");
  const [newGRNItem, setNewGRNItem] = useState("");
  const [newGRNQtyOrdered, setNewGRNQtyOrdered] = useState(10);
  const [newGRNQtyRec, setNewGRNQtyRec] = useState(10);
  const [newGRNCondition, setNewGRNCondition] = useState("Good");
  const [newGRNReceivedBy, setNewGRNReceivedBy] = useState("Madam Lim (Staff)");

  // AI Extraction state
  const [selectedExtractFile, setSelectedExtractFile] = useState<File | null>(null);
  const [rawExtractText, setRawExtractText] = useState("");
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [extractionDocError, setExtractionDocError] = useState<string | null>(null);
  const [extractionSuccessMessage, setExtractionSuccessMessage] = useState<string | null>(null);

  // File change handler
  const handleExtractFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedExtractFile(e.target.files[0]);
    }
  };

  // Run AI Extraction for PO or GRN
  const handleRunAIExtraction = async () => {
    setIsExtractingDoc(true);
    setExtractionDocError(null);
    setExtractionSuccessMessage(null);

    try {
      let base64Data: string | undefined = undefined;
      let mimeType: string | undefined = undefined;

      if (selectedExtractFile) {
        mimeType = selectedExtractFile.type;
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedExtractFile);
        });
      }

      const endpoint = activeSheetTab === "po" ? "/api/extract-po" : "/api/extract-grn";
      const payload = {
        content: rawExtractText,
        base64Data,
        mimeType,
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to extract document data.");
      }

      const rawExt = data.data;
      const extractedItems: any[] = Array.isArray(rawExt)
        ? rawExt
        : rawExt && Array.isArray(rawExt.items)
        ? rawExt.items
        : rawExt
        ? [rawExt]
        : [];

      if (extractedItems.length === 0) {
        throw new Error("No readable records found in the uploaded document.");
      }

      if (activeSheetTab === "po") {
        const createdPOs: PurchaseOrder[] = extractedItems.map((ext: any, idx: number) => {
          const qty = typeof ext.qtyOrdered === "number" && ext.qtyOrdered > 0 ? ext.qtyOrdered : 1;
          const price = typeof ext.unitPrice === "number" && ext.unitPrice >= 0 ? ext.unitPrice : 0;
          const total = typeof ext.totalAmount === "number" && ext.totalAmount > 0 ? ext.totalAmount : qty * price;

          return {
            id: `po-ai-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            poNumber: ext.poNumber || `PO-EXT-${idx + 1}`,
            poDate: ext.poDate || new Date().toISOString().split("T")[0],
            supplier: ext.supplier || "Extracted Supplier",
            itemDescription: ext.itemDescription || "Extracted Item",
            qtyOrdered: qty,
            unitPrice: price,
            totalAmount: total,
            expectedDeliveryDate: ext.expectedDeliveryDate || new Date().toISOString().split("T")[0],
          };
        });

        // Add ALL extracted POs into state directly
        setPurchaseOrders((prev) => [...createdPOs, ...prev]);

        // Pre-fill modal form with first item for inspection
        const firstPO = createdPOs[0];
        if (firstPO) {
          setNewPONum(firstPO.poNumber);
          setNewPODate(firstPO.poDate);
          setNewPOSupplier(firstPO.supplier);
          setNewPOItem(firstPO.itemDescription);
          setNewPOQty(firstPO.qtyOrdered);
          setNewPOUnitPrice(firstPO.unitPrice);
          setNewPOExpectedDate(firstPO.expectedDeliveryDate);
        }

        setExtractionSuccessMessage(
          `Successfully extracted ${createdPOs.length} Purchase Order record(s) from document and added them to Data Hub!`
        );
      } else {
        const createdGRNs: GoodsReceivedNote[] = extractedItems.map((ext: any, idx: number) => {
          const qtyOrd = typeof ext.qtyOrdered === "number" ? ext.qtyOrdered : typeof ext.qtyReceived === "number" ? ext.qtyReceived : 1;
          const qtyRec = typeof ext.qtyReceived === "number" ? ext.qtyReceived : qtyOrd;

          return {
            id: `grn-ai-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            grnNumber: ext.grnNumber || `GRN-EXT-${idx + 1}`,
            grnDate: ext.grnDate || new Date().toISOString().split("T")[0],
            poNumber: ext.poNumber || "PO-REF",
            supplier: ext.supplier || "Extracted Supplier",
            itemDescription: ext.itemDescription || "Received Item",
            qtyOrdered: qtyOrd,
            qtyReceived: qtyRec,
            condition: ext.condition || "Good",
            receivedBy: ext.receivedBy || "Warehouse Staff",
          };
        });

        // Add ALL extracted GRNs into state directly
        setGRNs((prev) => [...createdGRNs, ...prev]);

        // Pre-fill modal form with first item for inspection
        const firstGRN = createdGRNs[0];
        if (firstGRN) {
          setNewGRNNum(firstGRN.grnNumber);
          setNewGRNDate(firstGRN.grnDate);
          setNewGRNPONum(firstGRN.poNumber);
          setNewGRNSupplier(firstGRN.supplier);
          setNewGRNItem(firstGRN.itemDescription);
          setNewGRNQtyOrdered(firstGRN.qtyOrdered);
          setNewGRNQtyRec(firstGRN.qtyReceived);
          setNewGRNCondition(firstGRN.condition);
          setNewGRNReceivedBy(firstGRN.receivedBy);
        }

        setExtractionSuccessMessage(
          `Successfully extracted ${createdGRNs.length} Goods Received Note record(s) from document and added them to Data Hub!`
        );
      }

      // Switch subtab to manual view so user can inspect auto-populated values
      setModalSubTab("manual");
    } catch (err: any) {
      console.error("AI Extraction Error:", err);
      setExtractionDocError(err.message || "Failed to parse document with Gemini AI.");
    } finally {
      setIsExtractingDoc(false);
    }
  };

  // Add PO Handler
  const handleAddPO = () => {
    if (!newPONum || !newPOSupplier || !newPOItem) {
      alert("Please fill in PO Number, Supplier, and Item Description.");
      return;
    }

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: newPONum,
      poDate: newPODate || new Date().toISOString().split("T")[0],
      supplier: newPOSupplier,
      itemDescription: newPOItem,
      qtyOrdered: newPOQty,
      unitPrice: newPOUnitPrice,
      totalAmount: newPOQty * newPOUnitPrice,
      expectedDeliveryDate: newPOExpectedDate || new Date().toISOString().split("T")[0],
    };

    setPurchaseOrders([newPO, ...purchaseOrders]);
    setShowAddModal(false);
    resetModalFields();
  };

  // Add GRN Handler
  const handleAddGRN = () => {
    if (!newGRNNum || !newGRNPONum || !newGRNSupplier) {
      alert("Please fill in GRN Number, PO Reference, and Supplier.");
      return;
    }

    const newGRN: GoodsReceivedNote = {
      id: `grn-${Date.now()}`,
      grnNumber: newGRNNum,
      grnDate: newGRNDate || new Date().toISOString().split("T")[0],
      poNumber: newGRNPONum,
      supplier: newGRNSupplier,
      itemDescription: newGRNItem || "Received Goods",
      qtyOrdered: newGRNQtyOrdered || newGRNQtyRec,
      qtyReceived: newGRNQtyRec,
      condition: newGRNCondition,
      receivedBy: newGRNReceivedBy || "Madam Lim (Staff)",
    };

    setGRNs([newGRN, ...grns]);
    setShowAddModal(false);
    resetModalFields();
  };

  const resetModalFields = () => {
    setNewPONum("");
    setNewPOSupplier("");
    setNewPOItem("");
    setNewPOQty(10);
    setNewPOUnitPrice(10);

    setNewGRNNum("");
    setNewGRNPONum("");
    setNewGRNSupplier("");
    setNewGRNItem("");
    setNewGRNQtyRec(10);

    setSelectedExtractFile(null);
    setRawExtractText("");
    setExtractionDocError(null);
    setExtractionSuccessMessage(null);
  };

  // CSV Export Helper
  const handleExportCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((obj) =>
      Object.values(obj)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      
      {/* Sheet Tabs Bar */}
      <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-medium px-4 overflow-x-auto">
        <button
          onClick={() => setActiveSheetTab("po")}
          className={`py-3.5 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeSheetTab === "po"
              ? "border-blue-600 text-blue-700 font-bold bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Package className="w-4 h-4 text-blue-600" />
          1. Purchase Orders ({purchaseOrders.length})
        </button>

        <button
          onClick={() => setActiveSheetTab("grn")}
          className={`py-3.5 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeSheetTab === "grn"
              ? "border-blue-600 text-blue-700 font-bold bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Truck className="w-4 h-4 text-blue-600" />
          2. Goods Received Notes ({grns.length})
        </button>

        <button
          onClick={() => setActiveSheetTab("verified")}
          className={`py-3.5 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeSheetTab === "verified"
              ? "border-blue-600 text-blue-700 font-bold bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-sky-600" />
          3. Verified Invoices ({verifiedInvoices.length})
        </button>

        <button
          onClick={() => setActiveSheetTab("payments")}
          className={`py-3.5 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeSheetTab === "payments"
              ? "border-blue-600 text-blue-700 font-bold bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <History className="w-4 h-4 text-indigo-600" />
          4. Payment History ({paymentHistory.length})
        </button>

        <button
          onClick={() => setActiveSheetTab("exceptions")}
          className={`py-3.5 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeSheetTab === "exceptions"
              ? "border-blue-600 text-blue-700 font-bold bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          5. Exception Log ({exceptionLogs.length})
        </button>

        <button
          onClick={() => setActiveSheetTab("approved")}
          className={`py-3.5 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeSheetTab === "approved"
              ? "border-blue-600 text-blue-700 font-bold bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          6. Approved for Payment ({approvedPayments.length})
        </button>
      </div>

      {/* Main Tab View */}
      <div className="p-5 space-y-4">
        
        {/* Action Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search table records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {(activeSheetTab === "po" || activeSheetTab === "grn") && (
              <button
                onClick={() => {
                  setModalSubTab("ai");
                  setShowAddModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
                Extract {activeSheetTab === "po" ? "PO" : "GRN"} with AI
              </button>
            )}

            {(activeSheetTab === "po" || activeSheetTab === "grn") && (
              <button
                onClick={() => {
                  setModalSubTab("manual");
                  setShowAddModal(true);
                }}
                className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Row
              </button>
            )}

            <button
              onClick={onAddBrandNewUnseenData}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Add Test Row
            </button>

            <button
              onClick={() => {
                const dataToExport =
                  activeSheetTab === "po"
                    ? purchaseOrders
                    : activeSheetTab === "grn"
                    ? grns
                    : activeSheetTab === "verified"
                    ? verifiedInvoices
                    : activeSheetTab === "payments"
                    ? paymentHistory
                    : activeSheetTab === "exceptions"
                    ? exceptionLogs
                    : approvedPayments;
                handleExportCSV(dataToExport, `sheet_${activeSheetTab}`);
              }}
              className="bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs px-3 py-1.5 rounded-lg border border-slate-300 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export CSV
            </button>
          </div>
        </div>

        {/* TAB 1: PURCHASE ORDERS */}
        {activeSheetTab === "po" && (
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/80 text-slate-700 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold">PO Number</th>
                  <th className="py-2.5 px-3 font-bold">PO Date</th>
                  <th className="py-2.5 px-3 font-bold">Supplier Name</th>
                  <th className="py-2.5 px-3 font-bold">Item Description</th>
                  <th className="py-2.5 px-3 font-bold">Qty Ordered</th>
                  <th className="py-2.5 px-3 font-bold">Unit Price</th>
                  <th className="py-2.5 px-3 font-bold">Total Amount</th>
                  <th className="py-2.5 px-3 font-bold">Expected Delivery</th>
                  <th className="py-2.5 px-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {purchaseOrders
                  .filter(
                    (po) =>
                      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      po.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      po.itemDescription.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{po.poNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500">{po.poDate}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{po.supplier}</td>
                      <td className="py-2.5 px-3 text-slate-700">{po.itemDescription}</td>
                      <td className="py-2.5 px-3 font-mono">{po.qtyOrdered}</td>
                      <td className="py-2.5 px-3 font-mono">${po.unitPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                        ${po.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{po.expectedDeliveryDate}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setPurchaseOrders(purchaseOrders.filter((p) => p.id !== po.id))}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: GOODS RECEIVED NOTES */}
        {activeSheetTab === "grn" && (
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/80 text-slate-700 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold">GRN Number</th>
                  <th className="py-2.5 px-3 font-bold">GRN Date</th>
                  <th className="py-2.5 px-3 font-bold">PO Reference</th>
                  <th className="py-2.5 px-3 font-bold">Supplier Name</th>
                  <th className="py-2.5 px-3 font-bold">Item Description</th>
                  <th className="py-2.5 px-3 font-bold">Qty Rec'd</th>
                  <th className="py-2.5 px-3 font-bold">Condition</th>
                  <th className="py-2.5 px-3 font-bold">Received By</th>
                  <th className="py-2.5 px-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {grns
                  .filter(
                    (g) =>
                      g.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      g.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      g.supplier.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((grn) => (
                    <tr key={grn.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{grn.grnNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500">{grn.grnDate}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{grn.poNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{grn.supplier}</td>
                      <td className="py-2.5 px-3 text-slate-700">{grn.itemDescription}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">{grn.qtyReceived}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          grn.condition.toLowerCase() === "good" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {grn.condition}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{grn.receivedBy}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setGRNs(grns.filter((g) => g.id !== grn.id))}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: VERIFIED INVOICES */}
        {activeSheetTab === "verified" && (
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/80 text-slate-700 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Invoice Number</th>
                  <th className="py-2.5 px-3 font-bold">Invoice Date</th>
                  <th className="py-2.5 px-3 font-bold">Supplier Name</th>
                  <th className="py-2.5 px-3 font-bold">PO Reference</th>
                  <th className="py-2.5 px-3 font-bold">Line Count</th>
                  <th className="py-2.5 px-3 font-bold">Total Amount</th>
                  <th className="py-2.5 px-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {verifiedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-2.5 px-3 text-slate-500">{inv.invoiceDate}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{inv.supplierName}</td>
                    <td className="py-2.5 px-3 font-mono text-blue-700 font-bold">{inv.poNumber}</td>
                    <td className="py-2.5 px-3 text-slate-500">{inv.lineItems.length}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">${inv.totalAmount.toFixed(2)}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        inv.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {inv.status || "PENDING"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: PAYMENT HISTORY */}
        {activeSheetTab === "payments" && (
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/80 text-slate-700 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Supplier Name</th>
                  <th className="py-2.5 px-3 font-bold">Invoice Number</th>
                  <th className="py-2.5 px-3 font-bold">Paid Amount</th>
                  <th className="py-2.5 px-3 font-bold">Payment Date</th>
                  <th className="py-2.5 px-3 font-bold">Payment Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paymentHistory.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-medium text-slate-900">{pay.supplier}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{pay.invoiceNumber}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">${pay.amount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-slate-500">{pay.date}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{pay.paymentReference || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: EXCEPTION LOG (AUDIT TRAIL) */}
        {activeSheetTab === "exceptions" && (
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/80 text-slate-700 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Timestamp</th>
                  <th className="py-2.5 px-3 font-bold">Invoice #</th>
                  <th className="py-2.5 px-3 font-bold">Supplier</th>
                  <th className="py-2.5 px-3 font-bold">PO Ref</th>
                  <th className="py-2.5 px-3 font-bold">Tier Status</th>
                  <th className="py-2.5 px-3 font-bold">Reviewer</th>
                  <th className="py-2.5 px-3 font-bold">Action Taken</th>
                  <th className="py-2.5 px-3 font-bold">Mandatory Notes / Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {exceptionLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{log.timestamp}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{log.invoiceNumber}</td>
                    <td className="py-2.5 px-3 text-slate-800">{log.supplier}</td>
                    <td className="py-2.5 px-3 font-mono text-blue-700 font-bold">{log.poNumber}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        log.status === "GREEN" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : log.status === "AMBER" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">{log.reviewer}</td>
                    <td className="py-2.5 px-3 text-slate-900 font-semibold">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-600 italic text-[11px] max-w-xs">{log.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: APPROVED FOR PAYMENT */}
        {activeSheetTab === "approved" && (
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/80 text-slate-700 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Approved Date</th>
                  <th className="py-2.5 px-3 font-bold">Invoice Number</th>
                  <th className="py-2.5 px-3 font-bold">Supplier Name</th>
                  <th className="py-2.5 px-3 font-bold">PO Reference</th>
                  <th className="py-2.5 px-3 font-bold">Approved Amount</th>
                  <th className="py-2.5 px-3 font-bold">Approved By</th>
                  <th className="py-2.5 px-3 font-bold">Sign-off Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {approvedPayments.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{app.approvedDate}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{app.invoiceNumber}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{app.supplier}</td>
                    <td className="py-2.5 px-3 font-mono text-blue-700 font-bold">{app.poNumber}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">${app.amount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-slate-800">{app.approvedBy}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">{app.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Add Row Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-serif font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Add {activeSheetTab === "po" ? "Purchase Order (PO)" : "Goods Received Note (GRN)"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Subtabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 p-1 rounded-lg text-xs">
              <button
                onClick={() => setModalSubTab("ai")}
                className={`flex-1 py-1.5 rounded-md font-medium transition flex items-center justify-center gap-1.5 ${
                  modalSubTab === "ai"
                    ? "bg-blue-600 text-white font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Document Extractor
              </button>

              <button
                onClick={() => setModalSubTab("manual")}
                className={`flex-1 py-1.5 rounded-md font-medium transition flex items-center justify-center gap-1.5 ${
                  modalSubTab === "manual"
                    ? "bg-blue-600 text-white font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Manual Entry Form
              </button>
            </div>

            {/* AI EXTRACTOR TAB */}
            {modalSubTab === "ai" && (
              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-3">
                  <p className="text-slate-500 text-[11px]">
                    Upload a file (Image or PDF) or paste raw text of a {activeSheetTab === "po" ? "Purchase Order" : "Goods Received Note"}. Gemini AI will extract all fields automatically.
                  </p>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Upload File (Image / PDF)</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleExtractFileChange}
                      className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-100 cursor-pointer bg-white border border-slate-300 rounded-lg p-1"
                    />
                    {selectedExtractFile && (
                      <p className="text-[10px] text-blue-700 font-medium mt-1">
                        Selected: {selectedExtractFile.name} ({(selectedExtractFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Or Paste Raw Document Text</label>
                    <textarea
                      value={rawExtractText}
                      onChange={(e) => setRawExtractText(e.target.value)}
                      placeholder={
                        activeSheetTab === "po"
                          ? "PURCHASE ORDER #PO-8812\nSupplier: Fasteners Corp\nItem: Stainless Steel Bolts\nQty: 500 @ $1.20 = $600.00"
                          : "GOODS RECEIVED NOTE #GRN-4412\nPO Ref: PO-8812\nSupplier: Fasteners Corp\nQty Ordered: 500 | Qty Received: 500\nCondition: Good"
                      }
                      rows={3}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {extractionDocError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{extractionDocError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-1.5 rounded-lg border border-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRunAIExtraction}
                    disabled={isExtractingDoc || (!selectedExtractFile && !rawExtractText.trim())}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-1.5 rounded-lg transition flex items-center gap-2 shadow-xs"
                  >
                    {isExtractingDoc ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Extracting with Gemini...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Extract {activeSheetTab === "po" ? "PO" : "GRN"} Fields
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* MANUAL / EDIT ENTRY TAB */}
            {modalSubTab === "manual" && (
              <>
                {extractionSuccessMessage && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{extractionSuccessMessage}</span>
                  </div>
                )}

                {activeSheetTab === "po" && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 mb-1 font-medium">PO Number</label>
                        <input
                          type="text"
                          value={newPONum}
                          onChange={(e) => setNewPONum(e.target.value)}
                          placeholder="PO-9900"
                          className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-medium">PO Date</label>
                        <input
                          type="date"
                          value={newPODate}
                          onChange={(e) => setNewPODate(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1 font-medium">Supplier Name</label>
                      <input
                        type="text"
                        value={newPOSupplier}
                        onChange={(e) => setNewPOSupplier(e.target.value)}
                        placeholder="Acme Industrial"
                        className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1 font-medium">Item Description</label>
                      <input
                        type="text"
                        value={newPOItem}
                        onChange={(e) => setNewPOItem(e.target.value)}
                        placeholder="Hydraulic Pump"
                        className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 mb-1 font-medium">Qty Ordered</label>
                        <input
                          type="number"
                          value={newPOQty}
                          onChange={(e) => setNewPOQty(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-medium">Unit Price ($)</label>
                        <input
                          type="number"
                          value={newPOUnitPrice}
                          onChange={(e) => setNewPOUnitPrice(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1 font-medium">Expected Delivery Date</label>
                      <input
                        type="date"
                        value={newPOExpectedDate}
                        onChange={(e) => setNewPOExpectedDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-mono"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => setShowAddModal(false)}
                        className="bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-1.5 rounded-lg border border-slate-300 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddPO}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded-lg transition shadow-xs"
                      >
                        Save Purchase Order
                      </button>
                    </div>
                  </div>
                )}

                {activeSheetTab === "grn" && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 mb-1 font-medium">GRN Number</label>
                        <input
                          type="text"
                          value={newGRNNum}
                          onChange={(e) => setNewGRNNum(e.target.value)}
                          placeholder="GRN-9900"
                          className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-medium">GRN Date</label>
                        <input
                          type="date"
                          value={newGRNDate}
                          onChange={(e) => setNewGRNDate(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 mb-1 font-medium">PO Reference Number</label>
                        <input
                          type="text"
                          value={newGRNPONum}
                          onChange={(e) => setNewGRNPONum(e.target.value)}
                          placeholder="PO-1001"
                          className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-medium">Supplier Name</label>
                        <input
                          type="text"
                          value={newGRNSupplier}
                          onChange={(e) => setNewGRNSupplier(e.target.value)}
                          placeholder="Acme Industrial"
                          className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1 font-medium">Item Description</label>
                      <input
                        type="text"
                        value={newGRNItem}
                        onChange={(e) => setNewGRNItem(e.target.value)}
                        placeholder="Steel Rods 10mm"
                        className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 mb-1 font-medium">Qty Ordered</label>
                        <input
                          type="number"
                          value={newGRNQtyOrdered}
                          onChange={(e) => setNewGRNQtyOrdered(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-medium">Qty Received</label>
                        <input
                          type="number"
                          value={newGRNQtyRec}
                          onChange={(e) => setNewGRNQtyRec(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 mb-1 font-medium">Condition</label>
                        <select
                          value={newGRNCondition}
                          onChange={(e) => setNewGRNCondition(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                        >
                          <option value="Good">Good</option>
                          <option value="Damaged in transit">Damaged in transit</option>
                          <option value="Defective">Defective</option>
                          <option value="Shortage logged">Shortage logged</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-medium">Received By</label>
                        <input
                          type="text"
                          value={newGRNReceivedBy}
                          onChange={(e) => setNewGRNReceivedBy(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => setShowAddModal(false)}
                        className="bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-1.5 rounded-lg border border-slate-300 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddGRN}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded-lg transition shadow-xs"
                      >
                        Save Goods Received Note
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
