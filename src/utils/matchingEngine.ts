import {
  Invoice,
  PurchaseOrder,
  GoodsReceivedNote,
  PaymentRecord,
  MatchResult,
  LineItemMatch,
} from "../types";
import { isSupplierMatch, getStringSimilarity } from "./fuzzyMatch";

export function performThreeWayMatch(
  invoice: Invoice,
  purchaseOrders: PurchaseOrder[],
  grns: GoodsReceivedNote[],
  paymentHistory: PaymentRecord[]
): MatchResult {
  const explanations: string[] = [];
  const lineMatches: LineItemMatch[] = [];

  // ==========================================
  // STEP 0: Duplicate Invoice Check
  // ==========================================
  const duplicateMatch = paymentHistory.find((record) => {
    // Exact match: Same supplier + same invoice number
    const sameSupplier = isSupplierMatch(record.supplier, invoice.supplierName);
    const sameInvoiceNum =
      record.invoiceNumber.trim().toLowerCase() ===
      invoice.invoiceNumber.trim().toLowerCase();

    if (sameSupplier && sameInvoiceNum) {
      return true;
    }

    // Near-exact match: Same supplier + same total amount + date within 14 days
    const sameAmount = Math.abs(record.amount - invoice.totalAmount) < 0.01;
    if (sameSupplier && sameAmount) {
      const invDate = new Date(invoice.invoiceDate).getTime();
      const recDate = new Date(record.date).getTime();
      if (!isNaN(invDate) && !isNaN(recDate)) {
        const diffDays = Math.abs(invDate - recDate) / (1000 * 3600 * 24);
        if (diffDays <= 14) {
          return true;
        }
      }
    }

    return false;
  });

  if (duplicateMatch) {
    const isExactNum =
      duplicateMatch.invoiceNumber.trim().toLowerCase() ===
      invoice.invoiceNumber.trim().toLowerCase();
    
    const explanationStr = isExactNum
      ? `RED: Possible Duplicate Invoice — Invoice #${invoice.invoiceNumber} from '${invoice.supplierName}' ($${invoice.totalAmount.toFixed(
          2
        )}) has ALREADY been processed and paid on ${duplicateMatch.date} (Ref: ${duplicateMatch.paymentReference || "N/A"}).`
      : `RED: Possible Duplicate Invoice — An invoice of identical amount ($${invoice.totalAmount.toFixed(
          2
        )}) for '${invoice.supplierName}' was already paid on ${duplicateMatch.date} (Invoice #${duplicateMatch.invoiceNumber}).`;

    explanations.push(explanationStr);

    return {
      invoice,
      overallStatus: "RED",
      duplicateFound: true,
      duplicateRecord: duplicateMatch,
      poFound: false,
      grnFound: false,
      supplierMatch: false,
      lineMatches: [],
      explanations,
      summaryTitle: "Possible Duplicate Invoice Detected",
      recommendation:
        "BLOCK PAYMENT: This invoice matches an existing record in Payment History. Compare details side-by-side before proceeding.",
    };
  }

  // ==========================================
  // STEP 1: Locate PO and GRN
  // ==========================================
  const targetPONum = invoice.poNumber.trim().toLowerCase();

  // Find PO by PO number
  const matchedPOList = purchaseOrders.filter(
    (po) => po.poNumber.trim().toLowerCase() === targetPONum
  );

  const matchedPO = matchedPOList.length > 0 ? matchedPOList[0] : undefined;
  const poFound = !!matchedPO;

  // Find GRN by PO number
  const matchedGRNList = grns.filter(
    (grn) => grn.poNumber.trim().toLowerCase() === targetPONum
  );
  const matchedGRN = matchedGRNList.length > 0 ? matchedGRNList[0] : undefined;
  const grnFound = !!matchedGRN;

  // Handle Edge Case 1: No matching PO
  if (!poFound) {
    explanations.push(
      `RED: No matching PO found — Invoice references PO #${invoice.poNumber}, but no corresponding Purchase Order exists in the PO system.`
    );

    return {
      invoice,
      overallStatus: "RED",
      duplicateFound: false,
      poFound: false,
      grnFound: false,
      supplierMatch: false,
      lineMatches: [],
      explanations,
      summaryTitle: "Missing Purchase Order Reference",
      recommendation:
        "BLOCK PAYMENT: Verify with Procurement whether PO #" +
        invoice.poNumber +
        " was authorized or if the PO number was mistyped.",
    };
  }

  // Handle Edge Case 2: Supplier Mismatch
  const supplierMatch = isSupplierMatch(matchedPO.supplier, invoice.supplierName);
  if (!supplierMatch) {
    explanations.push(
      `RED: Supplier mismatch — Invoice is issued by '${invoice.supplierName}', but PO #${matchedPO.poNumber} was authorized for a different supplier '${matchedPO.supplier}'.`
    );

    return {
      invoice,
      overallStatus: "RED",
      duplicateFound: false,
      poFound: true,
      matchedPO,
      grnFound: false,
      supplierMatch: false,
      supplierPOMatchedName: matchedPO.supplier,
      lineMatches: [],
      explanations,
      summaryTitle: "Supplier Mismatch Detected",
      recommendation:
        "BLOCK PAYMENT: The invoice supplier name does not match the vendor on the Purchase Order. Check for vendor name changes or incorrect PO numbers.",
    };
  }

  // Handle Edge Case 3: Missing GRN
  if (!grnFound) {
    explanations.push(
      `RED: Goods not yet recorded as received — PO #${matchedPO.poNumber} exists, but no Goods Received Note (GRN) has been entered by the warehouse.`
    );

    return {
      invoice,
      overallStatus: "RED",
      duplicateFound: false,
      poFound: true,
      matchedPO,
      grnFound: false,
      supplierMatch: true,
      lineMatches: [],
      explanations,
      summaryTitle: "Pending Goods Receiving (GRN Missing)",
      recommendation:
        "HOLD PAYMENT: Contact the warehouse team to confirm if goods for PO #" +
        matchedPO.poNumber +
        " have arrived and logged into GRN records.",
    };
  }

  // ==========================================
  // STEP 2: Line-by-Line Reconciliation
  // ==========================================
  let overallStatus: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';

  // Calculate sum of line items from invoice
  let invoiceCalculatedTotal = 0;

  invoice.lineItems.forEach((invLine, idx) => {
    // Try to match corresponding PO / GRN row by description similarity or index
    let poLine = matchedPOList.find((po) =>
      getStringSimilarity(po.itemDescription, invLine.description) > 0.4
    ) || matchedPOList[idx] || matchedPO;

    let grnLine = matchedGRNList.find((grn) =>
      getStringSimilarity(grn.itemDescription, invLine.description) > 0.4
    ) || matchedGRNList[idx] || matchedGRN;

    const qtyOrdered = poLine ? poLine.qtyOrdered : 0;
    const qtyReceived = grnLine ? grnLine.qtyReceived : 0;
    const qtyBilled = invLine.qty;

    const unitPricePO = poLine ? poLine.unitPrice : 0;
    const unitPriceBilled = invLine.unitPrice;

    const lineTotalBilled = invLine.total || qtyBilled * unitPriceBilled;
    const lineTotalPO = qtyOrdered * unitPricePO;
    invoiceCalculatedTotal += lineTotalBilled;

    const grnCondition = grnLine ? grnLine.condition || "Good" : "Unknown";

    let lineStatus: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';
    let lineIssues: string[] = [];

    // Check 1: Quantity Shortfall / Billed vs Received
    if (qtyBilled > qtyReceived) {
      const shortfall = qtyBilled - qtyReceived;
      if (qtyReceived === 0) {
        lineStatus = 'RED';
        lineIssues.push(
          `Billed for ${qtyBilled} units, but GRN records 0 units received.`
        );
      } else {
        // Shortfall case
        lineStatus = 'AMBER';
        lineIssues.push(
          `PO ordered ${qtyOrdered} units, GRN shows ${qtyReceived} received. Invoice bills for ${qtyBilled} (shortfall of ${shortfall} units).`
        );
      }
    }

    // Check 2: Unit Price Variance
    if (unitPricePO > 0 && Math.abs(unitPriceBilled - unitPricePO) > 0.001) {
      const priceDiff = unitPriceBilled - unitPricePO;
      const pctDiff = (priceDiff / unitPricePO) * 100;

      if (priceDiff > 0) {
        if (pctDiff > 5) {
          lineStatus = 'RED';
          lineIssues.push(
            `Unit price billed is $${unitPriceBilled.toFixed(
              2
            )}, which exceeds PO price ($${unitPricePO.toFixed(
              2
            )}) by +${pctDiff.toFixed(1)}% (above 5% tolerance).`
          );
        } else {
          lineStatus = (lineStatus === 'RED' ? 'RED' : 'AMBER') as 'GREEN' | 'AMBER' | 'RED';
          lineIssues.push(
            `Minor unit price variance: Billed $${unitPriceBilled.toFixed(
              2
            )} vs PO $${unitPricePO.toFixed(2)} (+${pctDiff.toFixed(1)}%).`
          );
        }
      }
    }

    // Check 3: GRN Condition
    if (grnCondition.trim().toLowerCase() !== "good") {
      if (
        grnCondition.toLowerCase().includes("damaged") ||
        grnCondition.toLowerCase().includes("defective")
      ) {
        lineStatus = 'AMBER';
        lineIssues.push(
          `GRN condition noted as '${grnCondition}' — goods received in damaged state.`
        );
      } else {
        lineStatus = (lineStatus === 'RED' ? 'RED' : 'AMBER') as 'GREEN' | 'AMBER' | 'RED';
        lineIssues.push(`GRN condition noted as '${grnCondition}'.`);
      }
    }

    // Update overall severity
    if (lineStatus === 'RED') {
      overallStatus = 'RED';
    } else if (lineStatus === 'AMBER' && (overallStatus as string) !== 'RED') {
      overallStatus = 'AMBER';
    }

    const lineIssueStr = lineIssues.length > 0 ? lineIssues.join(" ") : "All line parameters matched cleanly.";

    lineMatches.push({
      lineIndex: idx + 1,
      itemDescription: invLine.description,
      qtyOrdered,
      qtyReceived,
      qtyBilled,
      unitPricePO,
      unitPriceBilled,
      condition: grnCondition,
      totalPO: lineTotalPO,
      totalBilled: lineTotalBilled,
      status: lineStatus,
      issue: lineIssueStr,
    });

    if (lineStatus !== 'GREEN') {
      explanations.push(
        `${lineStatus}: Line ${idx + 1} ('${invLine.description}') — ${lineIssueStr}`
      );
    }
  });

  // Check 4: Math Reconciliation (Invoice Grand Total vs Line Items Sum)
  if (Math.abs(invoiceCalculatedTotal - invoice.totalAmount) > 0.05) {
    overallStatus = 'RED';
    const mathDiff = invoice.totalAmount - invoiceCalculatedTotal;
    explanations.push(
      `RED: Invoice total math mismatch — Invoice header total is $${invoice.totalAmount.toFixed(
        2
      )}, but sum of line items equals $${invoiceCalculatedTotal.toFixed(
        2
      )} (variance of $${mathDiff.toFixed(2)}).`
    );
  }

  // Set Summary Titles & Recommendations
  let summaryTitle = "";
  let recommendation = "";

  const finalStatus: 'GREEN' | 'AMBER' | 'RED' = overallStatus as 'GREEN' | 'AMBER' | 'RED';

  if ((finalStatus as string) === 'GREEN') {
    summaryTitle = "Clean Match — All 3-Way Records Reconciled";
    recommendation =
      "READY FOR APPROVAL: All line quantities, unit prices, and GRN conditions match perfectly. Routed to Madam Lim for quick sign-off.";
  } else if ((finalStatus as string) === 'AMBER') {
    summaryTitle = "Minor Discrepancy — Madam Lim Review Needed";
    recommendation =
      "REVIEW NEEDED: Minor shortfall, price variance, or condition noted. Madam Lim may approve with a note or route to Procurement/Warehouse.";
  } else {
    summaryTitle = "Major Exception — Approval Blocked";
    recommendation =
      "PAYMENT BLOCKED: Critical mismatch detected. Mandatory resolution required before payment can be authorized.";
  }

  return {
    invoice,
    overallStatus: finalStatus,
    duplicateFound: false,
    poFound: true,
    matchedPO,
    grnFound: true,
    matchedGRN,
    supplierMatch: true,
    lineMatches,
    explanations,
    summaryTitle,
    recommendation,
  };
}
