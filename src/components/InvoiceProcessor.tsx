import React, { useState } from "react";
import { Invoice, InvoiceLineItem, MatchResult } from "../types";
import { extractInvoiceData, ExtractedInvoiceData } from "../utils/invoiceExtraction";
import {
  FileText,
  Upload,
  Plus,
  Play,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

interface InvoiceProcessorProps {
  invoices: Invoice[];
  onRunMatch: (invoice: Invoice) => void;
  onAddInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  selectedInvoiceId?: string;
  onLoadBenchmarkSuite?: () => void;
}

export const InvoiceProcessor: React.FC<InvoiceProcessorProps> = ({
  invoices,
  onRunMatch,
  onAddInvoice,
  onDeleteInvoice,
  selectedInvoiceId,
  onLoadBenchmarkSuite,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'ai_upload' | 'manual'>('queue');
  const [searchTerm, setSearchTerm] = useState("");

  // AI Extractor state
  const [invoiceText, setInvoiceText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState("");
  const [extractionNotice, setExtractionNotice] = useState("");

  // Extracted / Form fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [contractTerms, setContractTerms] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: "", qty: 1, unitPrice: 0, total: 0 },
  ]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [gst, setGst] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [confidence, setConfidence] = useState<{
    invoiceNumber?: "High" | "Medium" | "Low";
    poNumber?: "High" | "Medium" | "Low";
    totalAmount?: "High" | "Medium" | "Low";
  }>({});

  // File drop handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Run Gemini AI extraction
  const handleExtractWithGemini = async () => {
    setIsExtracting(true);
    setExtractionError("");
    setExtractionNotice("");

    try {
      let data: ExtractedInvoiceData | any;

      if (selectedFile) {
        // Use client wrapper calling fresh server endpoint
        data = await extractInvoiceData(selectedFile);
      } else {
        const response = await fetch("/api/extract-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceContent: invoiceText || undefined,
            mimeType: selectedFile?.type || undefined,
            base64Data: fileBase64 || undefined,
          }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Extraction failed");
        }
        if (result.notice) {
          setExtractionNotice(result.notice);
        }
        data = result.data;
      }

      setInvoiceNumber(data.invoiceNumber || "");
      setSupplierName(data.supplierName || "");
      setPoNumber(data.poNumber || "");
      setPaymentTerms(data.paymentTerms || "");
      setContractTerms(data.paymentTerms || data.contractTerms || "");
      setInvoiceDate(data.invoiceDate || new Date().toISOString().split("T")[0]);

      if (data.lineItems && Array.isArray(data.lineItems) && data.lineItems.length > 0) {
        setLineItems(
          data.lineItems.map((item: any) => {
            const quantity = Number(item.quantity ?? item.qty) || 1;
            const unitPrice = Number(item.unitPrice) || 0;
            const lineTotal = Number(item.lineTotal ?? item.total) || quantity * unitPrice || 0;
            return {
              description: item.description || "Unspecified Hardware Item",
              qty: quantity,
              unitPrice: unitPrice,
              total: lineTotal,
            };
          })
        );
      }

      setSubtotal(Number(data.subtotal) || Number(data.totalAmount) || 0);
      setGst(Number(data.gst) || 0);
      setTotalAmount(Number(data.totalAmount) || 0);
      if (data.confidence) {
        setConfidence(data.confidence);
      }
    } catch (err: any) {
      console.error(err);
      setExtractionError(err.message || "Failed to extract invoice using Gemini AI.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Line item helpers
  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: "", qty: 1, unitPrice: 0, total: 0 }]);
  };

  const handleUpdateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...lineItems];
    const current = { ...updated[index], [field]: value };

    if (field === "qty" || field === "unitPrice") {
      current.total = (Number(current.qty) || 0) * (Number(current.unitPrice) || 0);
    }

    updated[index] = current;
    setLineItems(updated);

    // Auto update total
    const sum = updated.reduce((acc, curr) => acc + (curr.total || 0), 0);
    setTotalAmount(sum);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated);
    const sum = updated.reduce((acc, curr) => acc + (curr.total || 0), 0);
    setTotalAmount(sum);
  };

  // Submit invoice
  const handleSaveInvoice = () => {
    if (!invoiceNumber || !supplierName || !poNumber) {
      alert("Please fill in Invoice Number, Supplier Name, and PO Number.");
      return;
    }

    const newInv: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      invoiceDate,
      supplierName,
      poNumber,
      contractNumber: contractNumber || undefined,
      contractTerms: contractTerms || undefined,
      lineItems,
      totalAmount: totalAmount || lineItems.reduce((acc, curr) => acc + curr.total, 0),
      status: "PENDING",
    };

    onAddInvoice(newInv);
    setActiveSubTab("queue");

    // Reset form
    setInvoiceNumber("");
    setSupplierName("");
    setPoNumber("");
    setContractNumber("");
    setContractTerms("");
    setInvoiceText("");
    setSelectedFile(null);
    setFileBase64("");
    setLineItems([{ description: "", qty: 1, unitPrice: 0, total: 0 }]);
    setTotalAmount(0);
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.poNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-medium px-4">
        <button
          onClick={() => setActiveSubTab("queue")}
          className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition ${
            activeSubTab === "queue"
              ? "border-blue-600 text-blue-700 font-bold bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          Verified Invoices Queue ({invoices.length})
        </button>

        <button
          onClick={() => setActiveSubTab("ai_upload")}
          className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition ${
            activeSubTab === "ai_upload"
              ? "border-blue-600 text-blue-700 font-bold bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sparkles className="w-4 h-4 text-blue-600" />
          AI Invoice Document Extractor
        </button>

        <button
          onClick={() => setActiveSubTab("manual")}
          className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition ${
            activeSubTab === "manual"
              ? "border-blue-600 text-blue-700 font-bold bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Plus className="w-4 h-4" />
          Add Manual Invoice
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-5">
        
        {/* SUBTAB 1: INVOICES QUEUE */}
        {activeSubTab === "queue" && (
          <div className="space-y-4">
            
            {/* Search & Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by invoice #, supplier, PO..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <span className="text-xs text-slate-500 font-sans">
                Select <strong className="text-blue-700 font-semibold">Run 3-Way Match</strong> on any invoice to trigger live reconciliation.
              </span>
            </div>

            {/* Invoices Table or Empty State */}
            {invoices.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center space-y-5">
                <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center mx-auto text-blue-600 shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-base font-serif text-slate-900 font-bold">No Invoices in Queue</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The portal currently contains no active invoice documents. Get started by extracting a file with AI, adding a manual record, or loading benchmark sample test cases.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveSubTab("ai_upload")}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-xs"
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                    AI Invoice Extractor
                  </button>

                  <button
                    onClick={() => setActiveSubTab("manual")}
                    className="bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium px-4 py-2 rounded-lg border border-slate-300 transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Manual Invoice
                  </button>

                  {onLoadBenchmarkSuite && (
                    <button
                      onClick={onLoadBenchmarkSuite}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-4 py-2 rounded-lg border border-blue-200 transition flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                      Load Benchmark Test Suite
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100/80 text-slate-700 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-bold">Invoice #</th>
                      <th className="py-3 px-4 font-bold">Supplier Name</th>
                      <th className="py-3 px-4 font-bold">PO Ref</th>
                      <th className="py-3 px-4 font-bold">Contract / Ref</th>
                      <th className="py-3 px-4 font-bold">Line Items</th>
                      <th className="py-3 px-4 font-bold">Total Amount</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 text-right font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                          No invoices matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className={`hover:bg-slate-50/80 transition ${
                            selectedInvoiceId === inv.id ? "bg-blue-50/70 border-l-2 border-blue-600" : ""
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {inv.supplierName}
                          </td>
                          <td className="py-3 px-4 text-blue-700 font-mono font-bold">
                            {inv.poNumber}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 text-2xs">
                            {inv.contractNumber ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                                {inv.contractNumber}
                                {inv.contractTerms && <span className="text-slate-500 font-normal">({inv.contractTerms})</span>}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {inv.lineItems.length} item(s)
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                            ${inv.totalAmount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                inv.status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : inv.status === "REJECTED"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {inv.status || "PENDING"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => onRunMatch(inv)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-md shadow-xs transition inline-flex items-center gap-1"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Run 3-Way Match
                            </button>
                            <button
                              onClick={() => onDeleteInvoice(inv.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* SUBTAB 2: AI EXTRACTION */}
        {activeSubTab === "ai_upload" && (
          <div className="space-y-5 max-w-3xl">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 shadow-xs">
              <h3 className="text-sm font-serif text-slate-900 font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Upload or Paste Invoice Document for AI Extraction
              </h3>
              <p className="text-xs text-slate-500">
                Server-side Gemini AI extracts supplier information, PO references, line items, unit prices, and quantities.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Option 1: File Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Upload Invoice File (Image / PDF)
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-100 cursor-pointer bg-white border border-slate-300 rounded-lg p-1 shadow-2xs"
                  />
                  {selectedFile && (
                    <p className="text-[10px] text-blue-700 font-medium mt-1">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                {/* Option 2: Plain Text */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Or Paste Raw Invoice Text
                  </label>
                  <textarea
                    value={invoiceText}
                    onChange={(e) => setInvoiceText(e.target.value)}
                    placeholder="INVOICE #INV-909&#10;Supplier: Acme Corp&#10;PO Ref: PO-1001&#10;Line 1: Screws 100pcs @ $2.50 = $250.00"
                    rows={3}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
                  />
                </div>
              </div>

              <button
                onClick={handleExtractWithGemini}
                disabled={isExtracting || (!selectedFile && !invoiceText.trim())}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 text-xs px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-xs"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Extracting with Gemini AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    Extract Structured Invoice Data
                  </>
                )}
              </button>

              {extractionNotice && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg flex items-start gap-2 shadow-xs">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-0.5">
                    <p className="font-semibold text-blue-900">Extraction Complete</p>
                    <p className="text-blue-800 leading-relaxed">{extractionNotice}</p>
                  </div>
                </div>
              )}

              {extractionError && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-start gap-2 shadow-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-amber-900">Extraction Error</p>
                    <p className="text-amber-800 leading-relaxed">{extractionError}</p>
                    <button
                      type="button"
                      onClick={handleExtractWithGemini}
                      disabled={isExtracting}
                      className="mt-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-2xs font-medium inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      Retry Extraction
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Extracted Fields Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Review & Edit Extracted Invoice Fields
                </h4>

                {confidence.invoiceNumber && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-slate-500 font-medium">Confidence Ratings:</span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold border ${
                        confidence.invoiceNumber === "High"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : confidence.invoiceNumber === "Medium"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      Inv #: {confidence.invoiceNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold border ${
                        confidence.poNumber === "High"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : confidence.poNumber === "Medium"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      PO #: {confidence.poNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold border ${
                        confidence.totalAmount === "High"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : confidence.totalAmount === "Medium"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      Total: {confidence.totalAmount}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-600">Supplier Name</label>
                  </div>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. Acme Hardware & Tooling Ltd"
                    className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-600">Invoice Number</label>
                    {confidence.invoiceNumber && (
                      <span className="text-[9px] font-mono text-slate-400">
                        [{confidence.invoiceNumber}]
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2026-001"
                    className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-600">PO Number</label>
                    {confidence.poNumber && (
                      <span className="text-[9px] font-mono text-slate-400">
                        [{confidence.poNumber}]
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="e.g. PO-1001"
                    className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 font-mono font-bold text-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={contractTerms || paymentTerms}
                    onChange={(e) => {
                      setContractTerms(e.target.value);
                      setPaymentTerms(e.target.value);
                    }}
                    placeholder="e.g. 30 days net"
                    className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Line Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">Line Items (Description, Quantity, Unit Price, Line Total)</label>
                  <button
                    onClick={handleAddLineItem}
                    className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Line Item
                  </button>
                </div>

                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 text-xs items-center">
                    <input
                      type="text"
                      placeholder="Item description (e.g. M8 Stainless Bolts)"
                      value={item.description}
                      onChange={(e) => handleUpdateLineItem(idx, "description", e.target.value)}
                      className="col-span-5 bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => handleUpdateLineItem(idx, "qty", Number(e.target.value))}
                      className="col-span-2 bg-white border border-slate-300 rounded p-1.5 text-slate-800 font-mono"
                    />
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => handleUpdateLineItem(idx, "unitPrice", Number(e.target.value))}
                      className="col-span-2 bg-white border border-slate-300 rounded p-1.5 text-slate-800 font-mono"
                    />
                    <div className="col-span-2 font-mono font-bold text-emerald-700 text-right pr-2">
                      ${(item.total || 0).toFixed(2)}
                    </div>
                    <button
                      onClick={() => handleRemoveLineItem(idx)}
                      className="col-span-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-3">
                <div className="flex items-center gap-4 text-xs text-slate-600 font-mono">
                  <span>Subtotal: <strong>${(subtotal || lineItems.reduce((a, b) => a + b.total, 0)).toFixed(2)}</strong></span>
                  {gst > 0 && <span>GST: <strong>${gst.toFixed(2)}</strong></span>}
                  <span>Total Amount: <strong className="text-emerald-700 text-sm font-bold">${(totalAmount || lineItems.reduce((a, b) => a + b.total, 0)).toFixed(2)}</strong></span>
                </div>

                <button
                  onClick={handleSaveInvoice}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition shadow-xs"
                >
                  Save & Add to Verified Invoices Queue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: MANUAL ENTRY */}
        {activeSubTab === "manual" && (
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 max-w-2xl shadow-xs">
            <h3 className="text-sm font-serif text-slate-900 font-bold">Manual Invoice Entry</h3>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-9901"
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Apex Tools Ltd"
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">PO Reference Number</label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="e.g. PO-1001"
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Line Items</label>
              {lineItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 text-xs items-center">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => handleUpdateLineItem(idx, "description", e.target.value)}
                    className="col-span-5 bg-white border border-slate-300 rounded p-1.5 text-slate-800"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.qty}
                    onChange={(e) => handleUpdateLineItem(idx, "qty", Number(e.target.value))}
                    className="col-span-2 bg-white border border-slate-300 rounded p-1.5 text-slate-800 font-mono"
                  />
                  <input
                    type="number"
                    placeholder="Unit Price"
                    value={item.unitPrice}
                    onChange={(e) => handleUpdateLineItem(idx, "unitPrice", Number(e.target.value))}
                    className="col-span-2 bg-white border border-slate-300 rounded p-1.5 text-slate-800 font-mono"
                  />
                  <div className="col-span-3 font-mono font-bold text-emerald-700 text-right pr-2">
                    ${(item.total || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSaveInvoice}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition shadow-xs"
              >
                Add Invoice
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

