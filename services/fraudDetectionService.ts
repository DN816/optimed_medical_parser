import { Bill, BillData, FraudFlag, Vendor } from "../types";

/**
 * Checks a bill for multiple fraud signals:
 * 1. Duplicate Invoices
 * 2. Amount Anomalies
 * 3. Structural Tampering (Math Mismatch)
 * 4. Vendor Risk
 */
export const runFraudChecks = (
    currentBill: Bill, 
    billData: BillData,
    allBills: Bill[], 
    vendor?: Vendor
): FraudFlag[] => {
    const flags: FraudFlag[] = [];
    const billId = currentBill.id;
    const createdAt = new Date().toISOString();

    // Helper to create flags
    const addFlag = (
        type: FraudFlag['signal_type'], 
        severity: FraudFlag['severity'], 
        desc: string
    ) => {
        flags.push({
            id: Math.random().toString(36).substr(2, 9),
            bill_id: billId,
            signal_type: type,
            severity,
            description: desc,
            created_at: createdAt,
            status: 'active'
        });
    };

    // --- 1. Duplicate Detection ---
    const currentInvoiceNo = billData.invoice_details?.invoice_number;
    const currentAmount = billData.totals?.grand_total || 0;
    const currentVendorName = billData.seller_info?.supplier_name?.toLowerCase();
    
    // Check for exact Invoice Number duplication within same vendor
    if (currentInvoiceNo && currentVendorName) {
        const exactDuplicate = allBills.find(b => 
            b.id !== currentBill.id &&
            b.extracted_data?.invoice_details?.invoice_number === currentInvoiceNo &&
            b.extracted_data?.seller_info?.supplier_name?.toLowerCase() === currentVendorName
        );

        if (exactDuplicate) {
            addFlag('duplicate', 'high', `Duplicate Invoice Number "${currentInvoiceNo}" found for same vendor (Bill ID: ${exactDuplicate.id})`);
        }
    }

    // Check for "Fuzzy" Duplication (Same Amount + Same Vendor + Same Date)
    // Sometimes inv number is read wrong, but these 3 match
    if (currentAmount > 0 && currentVendorName) {
        const fuzzyDuplicate = allBills.find(b => 
            b.id !== currentBill.id &&
            Math.abs((b.extracted_data?.totals?.grand_total || 0) - currentAmount) < 1 && // Tolerance for float
            b.extracted_data?.seller_info?.supplier_name?.toLowerCase() === currentVendorName &&
            b.extracted_data?.invoice_details?.invoice_datetime === billData.invoice_details?.invoice_datetime
        );

        if (fuzzyDuplicate) {
             addFlag('duplicate', 'medium', `Potential duplicate: Same Amount, Vendor, and Date as Bill ID ${fuzzyDuplicate.id}`);
        }
    }


    // --- 2. Amount Anomalies ---
    // Hard Limit Check (Configurable in real app)
    const HIGH_VALUE_THRESHOLD = 50000;
    if (currentAmount > HIGH_VALUE_THRESHOLD) {
        addFlag('amount_anomaly', 'medium', `High Value Bill: Amount ${currentAmount} exceeds threshold of ${HIGH_VALUE_THRESHOLD}`);
    }

    // --- 3. Structural Tampering (Math Mismatch) ---
    // Reuse validation errors if they indicate math issues
    if (billData.validation_results?.errors['grand_total']) {
         addFlag('structural_tampering', 'high', `Math Mismatch: Totals do not equal sum of items or tax. Possible tampering.`);
    }


    // --- 4. Vendor Risk ---
    if (vendor) {
        if (vendor.status === 'blocked') {
             addFlag('vendor_risk', 'high', `Vendor "${vendor.name}" is on the Block List.`);
        } else if (vendor.trust_score < 50) {
             addFlag('vendor_risk', 'medium', `Low Trust Vendor: "${vendor.name}" has a trust score of ${vendor.trust_score}%.`);
        }
    }

    return flags;
};
