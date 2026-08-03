import { GoogleGenAI, Type } from "@google/genai";

export interface InvoiceLineItemExtracted {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ExtractedInvoiceData {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  poNumber: string;
  paymentTerms?: string;
  lineItems: InvoiceLineItemExtracted[];
  subtotal: number;
  gst?: number;
  totalAmount: number;
  confidence: {
    invoiceNumber: "High" | "Medium" | "Low";
    poNumber: "High" | "Medium" | "Low";
    totalAmount: "High" | "Medium" | "Low";
  };
}

/**
 * Converts a File object (PDF, JPEG, PNG) to a base64 string
 * (strips the data: URL prefix, which the API does not want).
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extracts structured invoice data from a single uploaded file.
 * Always makes a FRESH call — no caching, no reuse of any prior result.
 */
export async function extractInvoiceData(file: File): Promise<ExtractedInvoiceData> {
  const base64Data = await fileToBase64(file);

  const response = await fetch("/api/extract-invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mimeType: file.type,
      base64Data,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || result.notice || "Extraction failed");
  }

  return result.data as ExtractedInvoiceData;
}
