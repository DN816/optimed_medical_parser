import { BillData, Correction } from "../types";

/**
 * Compares original OCR data with user-edited data to generate correction logs.
 * Flattening strategy:
 * - seller_info.supplier_name
 * - invoice_items[0].mrp
 * - totals.grand_total
 */
export const detectCorrections = (
  original: BillData, 
  current: BillData, 
  userId: string
): Correction[] => {
  const corrections: Correction[] = [];
  const timestamp = new Date().toISOString();

  const addCorrection = (path: string, oldVal: any, newVal: any) => {
      // Normalize comparison (handle null vs undefined vs empty string vs number)
      const v1 = oldVal === null || oldVal === undefined ? '' : String(oldVal);
      const v2 = newVal === null || newVal === undefined ? '' : String(newVal);

      if (v1 !== v2) {
          corrections.push({
              id: Math.random().toString(36).substr(2, 9),
              field_path: path,
              original_value: oldVal,
              corrected_value: newVal,
              user_id: userId,
              timestamp
          });
      }
  };

  // 1. Top Level Objects
  const sections = ['seller_info', 'buyer_info', 'invoice_details', 'bank_details', 'totals'] as const;
  
  sections.forEach(section => {
      const origSec = original[section] || {};
      const currSec = current[section] || {};
      
      // @ts-ignore
      Object.keys({ ...origSec, ...currSec }).forEach(key => {
          // @ts-ignore
          addCorrection(`${section}.${key}`, origSec[key], currSec[key]);
      });
  });

  // 2. Invoice Items (Array Diffing - simplified by assuming index match for now)
  // In a real app, this needs ID-based matching or smarter list diffing
  const maxLen = Math.max(original.invoice_items?.length || 0, current.invoice_items?.length || 0);
  
  for (let i = 0; i < maxLen; i++) {
      const origItem = original.invoice_items?.[i] || {};
      const currItem = current.invoice_items?.[i] || {};
      
      Object.keys({ ...origItem, ...currItem }).forEach(key => {
          // @ts-ignore
          addCorrection(`invoice_items[${i}].${key}`, origItem[key], currItem[key]);
      });
  }

  return corrections;
};
