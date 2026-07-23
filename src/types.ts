export interface PurchaseOrder {
  id: string;
  poNumber: string;
  poDate: string;
  supplier: string;
  itemDescription: string;
  qtyOrdered: number;
  unitPrice: number;
  totalAmount: number;
  expectedDeliveryDate: string;
}

export interface GoodsReceivedNote {
  id: string;
  grnNumber: string;
  grnDate: string;
  poNumber: string;
  supplier: string;
  itemDescription: string;
  qtyOrdered: number;
  qtyReceived: number;
  condition: string; // e.g. "Good", "Damaged", "Defective", "Shortage"
  receivedBy: string;
}

export interface InvoiceLineItem {
  id?: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  poNumber: string;
  contractNumber?: string;
  contractTerms?: string;
  lineItems: InvoiceLineItem[];
  totalAmount: number;
  status?: 'PENDING' | 'GREEN' | 'AMBER' | 'RED' | 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface PaymentRecord {
  id: string;
  supplier: string;
  invoiceNumber: string;
  amount: number;
  date: string;
  paymentReference?: string;
}

export interface ExceptionLogEntry {
  id: string;
  timestamp: string;
  invoiceNumber: string;
  supplier: string;
  poNumber: string;
  status: 'GREEN' | 'AMBER' | 'RED';
  reviewer: string;
  action: string;
  notes: string;
}

export interface ApprovedPaymentRecord {
  id: string;
  approvedDate: string;
  invoiceNumber: string;
  supplier: string;
  poNumber: string;
  amount: number;
  approvedBy: string;
  notes: string;
}

export interface LineItemMatch {
  lineIndex: number;
  itemDescription: string;
  qtyOrdered: number;
  qtyReceived: number;
  qtyBilled: number;
  unitPricePO: number;
  unitPriceBilled: number;
  condition: string;
  totalPO: number;
  totalBilled: number;
  status: 'GREEN' | 'AMBER' | 'RED';
  issue: string;
}

export interface MatchResult {
  invoice: Invoice;
  overallStatus: 'GREEN' | 'AMBER' | 'RED';
  duplicateFound: boolean;
  duplicateRecord?: PaymentRecord;
  poFound: boolean;
  matchedPO?: PurchaseOrder;
  grnFound: boolean;
  matchedGRN?: GoodsReceivedNote;
  supplierMatch: boolean;
  supplierPOMatchedName?: string;
  lineMatches: LineItemMatch[];
  explanations: string[];
  summaryTitle: string;
  recommendation: string;
}
