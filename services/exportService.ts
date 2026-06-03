import { Bill } from "../types";
// @ts-ignore
import * as XLSX from 'xlsx';

type ExportFormat = 'json' | 'csv' | 'excel';

/**
 * Flattens a bill's data into an array of rows (one per line item).
 * If there are no items, it returns one row with just metadata.
 */
const flattenBill = (bill: Bill): any[] => {
  const data = bill.extracted_data;
  if (!data) return [];

  const baseData = {
    "Bill ID": bill.id,
    "File Name": bill.file_name,
    "Status": bill.status,
    "Confidence": bill.confidence_score,
    "Invoice No": data.invoice_details?.invoice_number,
    "Date": data.invoice_details?.invoice_datetime,
    "Supplier": data.seller_info?.supplier_name,
    "Supplier GSTIN": data.seller_info?.gst_number,
    "Patient": data.buyer_info?.name,
    "Grand Total": data.totals?.grand_total,
  };

  if (!data.invoice_items || data.invoice_items.length === 0) {
    return [baseData];
  }

  return data.invoice_items.map(item => ({
    ...baseData,
    "Item Name": item.product_name,
    "HSN": item.hsn_code,
    "Batch": item.batch_no,
    "Expiry": item.expiry_date,
    "Qty": item.quantity,
    "Rate": item.rate,
    "Taxable": item.taxable_amount,
    "CGST Amt": item.cgst_amount,
    "SGST Amt": item.sgst_amount,
    "Line Total": item.total,
  }));
};

/**
 * Generates the export file blob.
 */
export const generateExportFile = async (bills: Bill[], format: ExportFormat): Promise<{ blob: Blob, filename: string }> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `medibill_export_${timestamp}.${format === 'excel' ? 'xlsx' : format}`;

  if (format === 'json') {
    const jsonStr = JSON.stringify(bills.map(b => ({
      metadata: {
        id: b.id,
        filename: b.file_name,
        status: b.status,
        flags: b.flags
      },
      data: b.extracted_data
    })), null, 2);
    
    return {
      blob: new Blob([jsonStr], { type: 'application/json' }),
      filename
    };
  }

  if (format === 'csv') {
    // Flatten all bills
    const allRows = bills.flatMap(flattenBill);
    if (allRows.length === 0) return { blob: new Blob([]), filename };

    const worksheet = XLSX.utils.json_to_sheet(allRows);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    
    return {
      blob: new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' }),
      filename
    };
  }

  if (format === 'excel') {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      { Metric: "Total Bills", Value: bills.length },
      { Metric: "Successful", Value: bills.filter(b => b.status === 'completed').length },
      { Metric: "Needs Review", Value: bills.filter(b => b.status === 'needs_review').length },
      { Metric: "Total Value", Value: bills.reduce((sum, b) => sum + (b.extracted_data?.totals?.grand_total || 0), 0) }
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), "Summary");

    // Sheet 2: Bills (Metadata Level)
    const billsData = bills.map(b => ({
      "Bill ID": b.id,
      "File Name": b.file_name,
      "Status": b.status,
      "Confidence": b.confidence_score,
      "Validation Errors": b.extracted_data?.validation_results?.errors ? Object.keys(b.extracted_data.validation_results.errors).join(', ') : '',
      "Invoice No": b.extracted_data?.invoice_details?.invoice_number,
      "Date": b.extracted_data?.invoice_details?.invoice_datetime,
      "Supplier": b.extracted_data?.seller_info?.supplier_name,
      "Grand Total": b.extracted_data?.totals?.grand_total,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(billsData), "Bills Metadata");

    // Sheet 3: Items (Flattened Level)
    const itemsData = bills.flatMap(flattenBill);
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(itemsData), "All Items");

    // Write to buffer
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return {
      blob: new Blob([wbout], { type: 'application/octet-stream' }),
      filename
    };
  }

  throw new Error("Unsupported format");
};
