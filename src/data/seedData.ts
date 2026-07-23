import {
  PurchaseOrder,
  GoodsReceivedNote,
  Invoice,
  PaymentRecord,
  ExceptionLogEntry,
  ApprovedPaymentRecord,
} from "../types";

// Empty initial datasets so the app starts clean with 0 previous examples/documents
export const initialPurchaseOrders: PurchaseOrder[] = [];
export const initialGRNs: GoodsReceivedNote[] = [];
export const initialPaymentHistory: PaymentRecord[] = [];
export const initialVerifiedInvoices: Invoice[] = [];
export const initialExceptionLog: ExceptionLogEntry[] = [];
export const initialApprovedPayments: ApprovedPaymentRecord[] = [];

// Benchmark sample datasets available on demand if requested by the user
export const benchmarkSamplePOs: PurchaseOrder[] = [
  {
    id: "po-1",
    poNumber: "PO-1001",
    poDate: "2026-07-01",
    supplier: "Acme Hardware Supplies",
    itemDescription: "Heavy Duty Steel Screws M6 x 50mm",
    qtyOrdered: 100,
    unitPrice: 2.5,
    totalAmount: 250.0,
    expectedDeliveryDate: "2026-07-05",
  },
  {
    id: "po-2",
    poNumber: "PO-1002",
    poDate: "2026-07-03",
    supplier: "ToolCraft Pte Ltd",
    itemDescription: "Cordless Rotary Drill 18V Heavy Duty",
    qtyOrdered: 10,
    unitPrice: 120.0,
    totalAmount: 1200.0,
    expectedDeliveryDate: "2026-07-08",
  },
  {
    id: "po-3",
    poNumber: "PO-1003",
    poDate: "2026-07-05",
    supplier: "Titan Fasteners",
    itemDescription: "Stainless Steel Bolts M10 x 80mm",
    qtyOrdered: 50,
    unitPrice: 4.0,
    totalAmount: 200.0,
    expectedDeliveryDate: "2026-07-10",
  },
  {
    id: "po-4",
    poNumber: "PO-1004",
    poDate: "2026-07-07",
    supplier: "BuildMaster Construction",
    itemDescription: "Concrete Nails 2.5-inch Heavy Duty Box",
    qtyOrdered: 30,
    unitPrice: 15.0,
    totalAmount: 450.0,
    expectedDeliveryDate: "2026-07-12",
  },
];

export const benchmarkSampleGRNs: GoodsReceivedNote[] = [
  {
    id: "grn-1",
    grnNumber: "GRN-2001",
    grnDate: "2026-07-05",
    poNumber: "PO-1001",
    supplier: "Acme Hardware Supplies",
    itemDescription: "Heavy Duty Steel Screws M6 x 50mm",
    qtyOrdered: 100,
    qtyReceived: 100,
    condition: "Good",
    receivedBy: "John (Warehouse)",
  },
  {
    id: "grn-2",
    grnNumber: "GRN-2002",
    grnDate: "2026-07-08",
    poNumber: "PO-1002",
    supplier: "ToolCraft Pte Ltd",
    itemDescription: "Cordless Rotary Drill 18V Heavy Duty",
    qtyOrdered: 10,
    qtyReceived: 10,
    condition: "Damaged in transit (2/10 casing cracked)",
    receivedBy: "Ahmad (Warehouse)",
  },
  {
    id: "grn-3",
    grnNumber: "GRN-2003",
    grnDate: "2026-07-10",
    poNumber: "PO-1003",
    supplier: "Titan Fasteners",
    itemDescription: "Stainless Steel Bolts M10 x 80mm",
    qtyOrdered: 50,
    qtyReceived: 45,
    condition: "Good (Shortage of 5 units logged)",
    receivedBy: "John (Warehouse)",
  },
];

export const benchmarkSampleInvoices: Invoice[] = [
  {
    id: "inv-1",
    invoiceNumber: "INV-2026-001",
    invoiceDate: "2026-07-06",
    supplierName: "Acme Hardware Supplies",
    poNumber: "PO-1001",
    lineItems: [
      {
        description: "Heavy Duty Steel Screws M6 x 50mm",
        qty: 100,
        unitPrice: 2.5,
        total: 250.0,
      },
    ],
    totalAmount: 250.0,
    status: "PENDING",
  },
  {
    id: "inv-2",
    invoiceNumber: "INV-2026-003",
    invoiceDate: "2026-07-11",
    supplierName: "Titan Fasteners",
    poNumber: "PO-1003",
    lineItems: [
      {
        description: "Stainless Steel Bolts M10 x 80mm",
        qty: 50,
        unitPrice: 4.0,
        total: 200.0,
      },
    ],
    totalAmount: 200.0,
    status: "PENDING",
  },
  {
    id: "inv-3",
    invoiceNumber: "INV-2026-004",
    invoiceDate: "2026-07-09",
    supplierName: "ToolCraft Pte Ltd",
    poNumber: "PO-1002",
    lineItems: [
      {
        description: "Cordless Rotary Drill 18V Heavy Duty",
        qty: 10,
        unitPrice: 120.0,
        total: 1200.0,
      },
    ],
    totalAmount: 1200.0,
    status: "PENDING",
  },
];

