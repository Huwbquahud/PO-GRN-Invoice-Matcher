/**
 * Utility functions for fuzzy string matching and text normalization
 * used across Supplier Name and Item Description reconciliation.
 */

export function normalizeText(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .replace(/\b(pte|ltd|inc|corp|co|company|limited|llc)\b/gi, "")
    .replace(/\s+/g, " ");
}

export function isSupplierMatch(supplierA: string, supplierB: string): boolean {
  const normA = normalizeText(supplierA);
  const normB = normalizeText(supplierB);

  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // Calculate similarity
  const similarity = getStringSimilarity(normA, normB);
  return similarity >= 0.75;
}

export function getStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return (maxLen - distance) / maxLen;
}
