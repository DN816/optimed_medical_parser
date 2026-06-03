import React, { useState } from 'react';
import { BillData, InvoiceItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, AlertTriangle, CheckCircle, Lock, ChevronDown, ChevronRight, AlertCircle, RotateCcw, PenLine, User as UserIcon, Shield, Building2, FileText, Info } from 'lucide-react';

interface DataFormProps {
  data: BillData;
  originalData?: BillData; // New Prop
  onChange: (newData: BillData) => void;
  validationErrors: Record<string, string>;
}

export const DataForm: React.FC<DataFormProps> = ({ data, originalData, onChange, validationErrors }) => {
  const { user, logAction } = useAuth();
  const isReadOnly = user?.role === 'viewer';
  
  // Collapsible Sections State
  const [sections, setSections] = useState({
      seller: true,
      buyer: false,
      invoice: true,
      items: true,
      bank: false,
      totals: true,
      additionalInfo: true
  });

  const toggleSection = (key: keyof typeof sections) => {
      setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to handle nested object updates
  const handleNestedChange = (section: keyof BillData, field: string, value: string) => {
    if (isReadOnly) return;
    // @ts-ignore
    onChange({
      ...data,
      [section]: {
        // @ts-ignore
        ...data[section],
        [field]: value
      }
    });
  };

  // Helper to handle deep nested object updates (for additional_information)
  const handleDeepNestedChange = (section: keyof BillData, subSection: string, field: string, value: string) => {
    if (isReadOnly) return;
    const currentSection = (data[section] || {}) as any;
    const currentSubSection = currentSection[subSection] || {};
    
    // @ts-ignore
    onChange({
      ...data,
      [section]: {
        ...currentSection,
        [subSection]: {
          ...currentSubSection,
          [field]: value
        }
      }
    });
  };

  // Helper to handle items array updates
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string) => {
    if (isReadOnly) return;
    const newItems = [...(data.invoice_items || [])];
    
    // Convert numerical fields if possible
    let val: string | number | null = value;
    const numFields = [
      'sr_no', 'quantity', 'free', 'mrp', 'rate', 'gross_value', 
      'discount_percentage', 'discount_amount', 'taxable_amount', 
      'cgst_percentage', 'cgst_amount', 'sgst_percentage', 'sgst_amount', 'total'
    ];

    if (numFields.includes(field)) {
      if (value === '') val = 0; // Default to 0 if cleared
      else {
        const num = parseFloat(value);
        if (!isNaN(num)) val = num;
        else val = value; // fallback
      }
    } else {
        if (value === '') val = 'N/A';
        else val = value;
    }

    newItems[index] = { ...newItems[index], [field]: val };
    
    // Auto-calculate Row Total if Quantity or Rate changes (Simple Logic)
    if (field === 'quantity' || field === 'rate') {
        const qty = field === 'quantity' ? (typeof val === 'number' ? val : 0) : (newItems[index].quantity || 0);
        const rate = field === 'rate' ? (typeof val === 'number' ? val : 0) : (newItems[index].rate || 0);
        newItems[index].gross_value = qty * rate;
        newItems[index].taxable_amount = qty * rate; // Assuming no discount for simplicity
        newItems[index].total = qty * rate; // Pre-tax total
    }

    onChange({ ...data, invoice_items: newItems });
  };

  const handleDeleteItem = (index: number) => {
    if (isReadOnly) return;
    const newItems = (data.invoice_items || []).filter((_, i) => i !== index);
    onChange({ ...data, invoice_items: newItems });
    logAction('DELETE_ITEM', 'INVOICE_ITEM', `${index}`, { invoice_no: data.invoice_details.invoice_number });
  };

  const handleAddItem = () => {
    if (isReadOnly) return;
    onChange({
      ...data,
      invoice_items: [
        ...(data.invoice_items || []), 
        { 
          sr_no: (data.invoice_items?.length || 0) + 1,
          hsn_code: 'N/A', product_name: 'New Item', manufacturer: 'N/A', batch_no: 'N/A', expiry_date: 'N/A',
          quantity: 1, pack_size: 'N/A', free: 0, mrp: 0, rate: 0, gross_value: 0,
          discount_percentage: 0, discount_amount: 0, taxable_amount: 0,
          cgst_percentage: 0, cgst_amount: 0, sgst_percentage: 0, sgst_amount: 0, total: 0
        }
      ]
    });
    logAction('ADD_ITEM', 'INVOICE_ITEM', 'new', { invoice_no: data.invoice_details.invoice_number });
  };

  // Helper for numeric inputs in summary to handle nulls gracefully
  const handleTotalChange = (field: string, value: string) => {
      if (isReadOnly) return;
      const num = parseFloat(value);
      // @ts-ignore
      onChange({
        ...data,
        totals: {
          ...data.totals,
          [field]: isNaN(num) ? 0 : num
        }
      });
  };

  const isHighConfidence = (data.confidence_score || 0) > 0.8;

  // Display helpers to ensure no blank values
  const strVal = (val: string | null | undefined) => val ?? '';
  const numVal = (val: number | null | undefined) => val ?? 0;

  // Check Correction Status
  // Checks if current value differs from original value
  const isFieldCorrected = (section: string, field: string, currentValue: any) => {
      if (!originalData) return false;
      // @ts-ignore
      const originalValue = originalData[section]?.[field];
      
      const v1 = currentValue === null || currentValue === undefined ? '' : String(currentValue);
      const v2 = originalValue === null || originalValue === undefined ? '' : String(originalValue);
      return v1 !== v2;
  };
  
  // Get Original Value for Tooltip
  const getOriginalValue = (section: string, field: string) => {
      if (!originalData) return '';
      // @ts-ignore
      return String(originalData[section]?.[field] ?? 'Empty');
  };

  // Input Class Helper
  const getInputClass = (section: string, field: string, errorKey?: string) => {
    const sectionData = (data as any)[section] || {};
    const val = sectionData[field];
    const corrected = isFieldCorrected(section, field, val);

    return `
    w-full p-2 border rounded text-sm outline-none transition-all
    ${corrected ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-100 text-purple-900 font-medium' : ''}
    ${errorKey && validationErrors[errorKey] 
        ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
        : (corrected ? '' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500')
    }
  `;
  };

  const CorrectionIndicator = ({ section, field }: { section: string, field: string }) => {
      const sectionData = (data as any)[section] || {};
      const val = sectionData[field];
      if (!isFieldCorrected(section, field, val)) return null;

      return (
          <div className="group absolute right-2 top-8 z-10">
              <PenLine className="w-3 h-3 text-purple-500" />
              <div className="hidden group-hover:block absolute right-0 bottom-full mb-1 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg">
                  <span className="text-slate-400 block text-[10px] uppercase">Original Value:</span>
                  {getOriginalValue(section, field)}
              </div>
          </div>
      );
  };

  // Deep Correction Indicator for additional_information
  const isDeepFieldCorrected = (section: string, subSection: string, field: string, currentValue: any) => {
      if (!originalData) return false;
      const originalValue = (originalData as any)[section]?.[subSection]?.[field];
      
      const v1 = currentValue === null || currentValue === undefined ? '' : String(currentValue);
      const v2 = originalValue === null || originalValue === undefined ? '' : String(originalValue);
      return v1 !== v2;
  };

  const getDeepOriginalValue = (section: string, subSection: string, field: string) => {
      if (!originalData) return '';
      return String((originalData as any)[section]?.[subSection]?.[field] ?? 'Empty');
  };

  const getDeepInputClass = (section: string, subSection: string, field: string) => {
    const val = (data as any)[section]?.[subSection]?.[field];
    const corrected = isDeepFieldCorrected(section, subSection, field, val);

    return `
    w-full p-2 border rounded text-sm outline-none transition-all
    ${corrected ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-100 text-purple-900 font-medium' : ''}
    ${corrected ? '' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}
  `;
  };

  const DeepCorrectionIndicator = ({ section, subSection, field }: { section: string, subSection: string, field: string }) => {
      const val = (data as any)[section]?.[subSection]?.[field];
      if (!isDeepFieldCorrected(section, subSection, field, val)) return null;

      return (
          <div className="group absolute right-2 top-8 z-10">
              <PenLine className="w-3 h-3 text-purple-500" />
              <div className="hidden group-hover:block absolute right-0 bottom-full mb-1 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg z-20">
                  <span className="text-slate-400 block text-[10px] uppercase">Original Value:</span>
                  {getDeepOriginalValue(section, subSection, field)}
              </div>
          </div>
      );
  };

  const SectionHeader = ({ title, isOpen, onToggle, hasError }: { title: string, isOpen: boolean, onToggle: () => void, hasError?: boolean }) => (
      <button 
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors mb-2
        ${isOpen ? 'bg-slate-100 text-slate-700' : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-100'}
        ${hasError ? 'text-red-600 bg-red-50' : ''}
        `}
      >
          <div className="flex items-center gap-2">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {title}
          </div>
          {hasError && <AlertCircle className="w-4 h-4 text-red-500" />}
      </button>
  );

  return (
    <div className="h-full overflow-y-auto p-6 bg-white relative">
      
      {/* Read Only Banner */}
      {isReadOnly && (
        <div className="sticky top-0 z-10 bg-amber-50 text-amber-800 px-4 py-2 text-xs font-bold border-b border-amber-200 flex items-center justify-center gap-2 mb-4 -mx-6 -mt-6">
            <Lock className="w-3 h-3" /> Viewer Mode: Editing Disabled
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 mt-2">
        <h2 className="text-xl font-bold text-slate-800">Extracted Data</h2>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${isHighConfidence ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {isHighConfidence ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          Confidence: {Math.round((data.confidence_score || 0) * 100)}%
        </div>
      </div>

      <div className={`space-y-4 ${isReadOnly ? 'opacity-90 pointer-events-none' : ''}`}>
        
        {/* Seller Info */}
        <div>
            <SectionHeader title="Seller / Pharmacy Info" isOpen={sections.seller} onToggle={() => toggleSection('seller')} />
            {sections.seller && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 mb-4 animate-in slide-in-from-top-2">
                    <div className="col-span-2 relative">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
                        <input type="text" value={strVal(data.seller_info?.supplier_name)} 
                            onChange={e => handleNestedChange('seller_info', 'supplier_name', e.target.value)}
                            readOnly={isReadOnly}
                            className={getInputClass('seller_info', 'supplier_name')} />
                        <CorrectionIndicator section="seller_info" field="supplier_name" />
                    </div>
                    <div className="col-span-2 relative">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Address</label>
                        <input type="text" value={strVal(data.seller_info?.supplier_address)} 
                            onChange={e => handleNestedChange('seller_info', 'supplier_address', e.target.value)}
                            readOnly={isReadOnly}
                            className={getInputClass('seller_info', 'supplier_address')} />
                        <CorrectionIndicator section="seller_info" field="supplier_address" />
                    </div>
                    <div className="relative">
                        <label className="block text-xs font-medium text-slate-500 mb-1">GSTIN</label>
                        <input type="text" value={strVal(data.seller_info?.gst_number)} 
                            onChange={e => handleNestedChange('seller_info', 'gst_number', e.target.value)}
                            readOnly={isReadOnly}
                            className={getInputClass('seller_info', 'gst_number')} />
                        <CorrectionIndicator section="seller_info" field="gst_number" />
                    </div>
                </div>
            )}
        </div>

        {/* Invoice & Buyer Info */}
        <div>
            <SectionHeader title="Invoice Details" isOpen={sections.invoice} onToggle={() => toggleSection('invoice')} hasError={!!validationErrors['invoice_number']} />
            {sections.invoice && (
                <div className="grid grid-cols-2 gap-4 p-2 mb-4 animate-in slide-in-from-top-2">
                    <div className="relative">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Invoice Number *</label>
                        <input type="text" value={strVal(data.invoice_details?.invoice_number)} 
                        onChange={e => handleNestedChange('invoice_details', 'invoice_number', e.target.value)}
                        readOnly={isReadOnly}
                        className={getInputClass('invoice_details', 'invoice_number', 'invoice_number')} />
                         <CorrectionIndicator section="invoice_details" field="invoice_number" />
                    </div>
                    <div className="relative">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Date *</label>
                        <input type="text" value={strVal(data.invoice_details?.invoice_datetime)} 
                        onChange={e => handleNestedChange('invoice_details', 'invoice_datetime', e.target.value)}
                        readOnly={isReadOnly}
                        className={getInputClass('invoice_details', 'invoice_datetime', 'invoice_date')} />
                         <CorrectionIndicator section="invoice_details" field="invoice_datetime" />
                    </div>
                    <div className="relative">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                        <input type="text" value={strVal(data.invoice_details?.invoice_type)} 
                        onChange={e => handleNestedChange('invoice_details', 'invoice_type', e.target.value)}
                        readOnly={isReadOnly}
                        className={getInputClass('invoice_details', 'invoice_type')} placeholder="Cash/Credit" />
                         <CorrectionIndicator section="invoice_details" field="invoice_type" />
                    </div>
                </div>
            )}
        </div>

        <div>
            <SectionHeader title="Buyer / Patient Info" isOpen={sections.buyer} onToggle={() => toggleSection('buyer')} />
            {sections.buyer && (
                 <div className="grid grid-cols-2 gap-4 p-2 mb-4 animate-in slide-in-from-top-2">
                    <div className="col-span-2 relative">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Patient Name</label>
                        <input type="text" value={strVal(data.buyer_info?.name)} 
                        onChange={e => handleNestedChange('buyer_info', 'name', e.target.value)}
                        readOnly={isReadOnly}
                        className={getInputClass('buyer_info', 'name')} />
                         <CorrectionIndicator section="buyer_info" field="name" />
                    </div>
                 </div>
            )}
        </div>

        {/* Invoice Items Table - Wide scrollable */}
        <div>
           <SectionHeader title="Line Items" isOpen={sections.items} onToggle={() => toggleSection('items')} />
           {sections.items && (
              <div className="animate-in slide-in-from-top-2">
                <div className="flex justify-end mb-2">
                    {!isReadOnly && (
                        <button onClick={handleAddItem} className="text-xs flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-medium border border-blue-100">
                        <Plus className="w-3 h-3" /> Add Item
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg pb-2">
                    <table className="min-w-[1800px] w-full text-left text-xs table-fixed">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                        <th className="p-2 w-16">Sr</th>
                        <th className="p-2 w-56">Product Name</th>
                        <th className="p-2 w-28">HSN</th>
                        <th className="p-2 w-28">Batch</th>
                        <th className="p-2 w-20">Qty</th>
                        <th className="p-2 w-24 text-right">MRP</th>
                        <th className="p-2 w-24 text-right">Rate</th>
                        <th className="p-2 w-28 text-right">Gross Val</th>
                        <th className="p-2 w-24 text-right">Disc Amt</th>
                        <th className="p-2 w-28 text-right">Taxable</th>
                        <th className="p-2 w-24 text-right">CGST Amt</th>
                        <th className="p-2 w-24 text-right">SGST Amt</th>
                        <th className="p-2 w-32 text-right">Total</th>
                        <th className="p-2 w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.invoice_items?.map((item, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50">
                            <td className="p-1"><input type="number" value={numVal(item.sr_no)} onChange={e => handleItemChange(idx, 'sr_no', e.target.value)} readOnly={isReadOnly} className="w-full p-1 border rounded text-center" /></td>
                            <td className="p-1"><input type="text" value={strVal(item.product_name)} onChange={e => handleItemChange(idx, 'product_name', e.target.value)} readOnly={isReadOnly} className="w-full p-1 border rounded font-medium" /></td>
                            <td className="p-1"><input type="text" value={strVal(item.hsn_code)} onChange={e => handleItemChange(idx, 'hsn_code', e.target.value)} readOnly={isReadOnly} className="w-full p-1 border rounded" /></td>
                            <td className="p-1"><input type="text" value={strVal(item.batch_no)} onChange={e => handleItemChange(idx, 'batch_no', e.target.value)} readOnly={isReadOnly} className="w-full p-1 border rounded" /></td>
                            
                            <td className="p-1"><input type="number" value={numVal(item.quantity)} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} readOnly={isReadOnly} className="w-full p-1 border rounded text-center bg-blue-50/50 font-bold text-slate-700" /></td>
                            
                            <td className="p-1"><input type="number" value={numVal(item.mrp)} onChange={e => handleItemChange(idx, 'mrp', e.target.value)} readOnly={isReadOnly} className="w-full p-1 border rounded text-right" /></td>
                            <td className="p-1"><input type="number" value={numVal(item.rate)} onChange={e => handleItemChange(idx, 'rate', e.target.value)} readOnly={isReadOnly} className="w-full p-1 border rounded text-right" /></td>
                            <td className="p-1"><input type="number" value={numVal(item.gross_value)} onChange={e => handleItemChange(idx, 'gross_value', e.target.value)} readOnly={isReadOnly} className="w-full p-1 border rounded text-right" /></td>
                            <td className="p-1"><input type="number" value={numVal(item.discount_amount)} onChange={e => handleItemChange(idx, 'discount_amount', e.target.value)} readOnly={isReadOnly} className="w-full p-1 border rounded text-right text-green-600" /></td>
                            <td className="p-1"><input type="number" value={numVal(item.taxable_amount)} onChange={e => handleItemChange(idx, 'taxable_amount', e.target.value)} readOnly={isReadOnly} className="w-full p-1 border rounded text-right" /></td>
                            <td className="p-1"><input type="number" value={numVal(item.cgst_amount)} onChange={e => handleItemChange(idx, 'cgst_amount', e.target.value)} readOnly={isReadOnly} className="w-full p-1 border rounded text-right text-slate-500" /></td>
                            <td className="p-1"><input type="number" value={numVal(item.sgst_amount)} onChange={e => handleItemChange(idx, 'sgst_amount', e.target.value)} readOnly={isReadOnly} className="w-full p-1 border rounded text-right text-slate-500" /></td>
                            <td className="p-1"><input type="number" value={numVal(item.total)} onChange={e => handleItemChange(idx, 'total', e.target.value)} readOnly={isReadOnly} className="w-full p-1 border rounded text-right font-bold text-slate-900" /></td>
                            <td className="p-1">
                                {!isReadOnly && (
                                    <button onClick={() => handleDeleteItem(idx)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                )}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
              </div>
           )}
        </div>

        <div className="mt-6">
             <SectionHeader title="Financial Summary" isOpen={sections.totals} onToggle={() => toggleSection('totals')} hasError={!!validationErrors['grand_total']} />
             {sections.totals && (
                <section className="bg-slate-50 p-4 rounded-lg border border-slate-200 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                        {[
                        { label: 'Total Items', key: 'total_items' },
                        { label: 'Total MRP', key: 'total_mrp' },
                        { label: 'Total Discount', key: 'total_discount_amount', color: 'text-green-600' },
                        { label: 'Taxable Value', key: 'total_taxable_value' },
                        { label: 'Total CGST', key: 'total_cgst', color: 'text-red-600' },
                        { label: 'Total SGST', key: 'total_sgst', color: 'text-red-600' },
                        ].map(f => (
                        <div key={f.key} className="flex justify-between items-center text-sm relative group">
                            <span className="text-slate-600">{f.label}</span>
                            {/* @ts-ignore */}
                            <input type="number" value={numVal(data.totals?.[f.key])} 
                                onChange={e => handleTotalChange(f.key, e.target.value)}
                                readOnly={isReadOnly}
                                className={`w-32 text-right bg-transparent border-b border-dashed border-slate-300 outline-none ${f.color || 'text-slate-900'} ${isFieldCorrected('totals', f.key, data.totals?.[f.key as keyof typeof data.totals]) ? 'text-purple-700 font-bold border-purple-400' : ''}`} />
                             {isFieldCorrected('totals', f.key, data.totals?.[f.key as keyof typeof data.totals]) && <PenLine className="w-3 h-3 text-purple-500 absolute right-36" />}
                        </div>
                        ))}
                        <div className="h-px bg-slate-300 my-2"></div>
                        <div className="flex justify-between items-center font-bold text-lg relative">
                            <span>Grand Total</span>
                            <input type="number" value={numVal(data.totals?.grand_total)} 
                                onChange={e => handleTotalChange('grand_total', e.target.value)}
                                readOnly={isReadOnly}
                                className={`w-40 text-right bg-transparent border-b border-slate-400 outline-none text-blue-700 
                                ${validationErrors['grand_total'] ? 'text-red-600 border-red-500' : ''}
                                ${isFieldCorrected('totals', 'grand_total', data.totals?.grand_total) ? 'text-purple-700 border-purple-400' : ''}
                                `} />
                            {isFieldCorrected('totals', 'grand_total', data.totals?.grand_total) && <PenLine className="w-4 h-4 text-purple-500 absolute right-44" />}
                        </div>
                        {validationErrors['grand_total'] && (
                            <p className="text-right text-xs text-red-500 mt-1">{validationErrors['grand_total']}</p>
                        )}
                    </div>
                </section>
             )}
        </div>

        {/* Additional Information */}
        {data.additional_information && Object.keys(data.additional_information).length > 0 && (
          <div className="mt-6">
            <SectionHeader title="Additional Information" isOpen={sections.additionalInfo} onToggle={() => toggleSection('additionalInfo')} />
            {sections.additionalInfo && (
              <div className="space-y-4 p-2 animate-in slide-in-from-top-2">
                
                {/* Doctor Info */}
                {data.additional_information.doctor_info && Object.keys(data.additional_information.doctor_info).length > 0 && (
                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-blue-500" /> Doctor Information
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['name', 'registration_number', 'department'].map(field => (
                        <div key={field} className="relative">
                          <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
                          <input type="text" value={strVal((data.additional_information?.doctor_info as any)?.[field])} 
                            onChange={e => handleDeepNestedChange('additional_information', 'doctor_info', field, e.target.value)}
                            readOnly={isReadOnly}
                            className={getDeepInputClass('additional_information', 'doctor_info', field)} />
                          <DeepCorrectionIndicator section="additional_information" subSection="doctor_info" field={field} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Patient Metadata */}
                {data.additional_information.patient_metadata && Object.keys(data.additional_information.patient_metadata).length > 0 && (
                  <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-indigo-500" /> Patient Metadata
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['uhid', 'patient_id', 'age', 'gender', 'registration_number'].map(field => (
                        <div key={field} className="relative">
                          <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
                          <input type="text" value={strVal((data.additional_information?.patient_metadata as any)?.[field])} 
                            onChange={e => handleDeepNestedChange('additional_information', 'patient_metadata', field, e.target.value)}
                            readOnly={isReadOnly}
                            className={getDeepInputClass('additional_information', 'patient_metadata', field)} />
                          <DeepCorrectionIndicator section="additional_information" subSection="patient_metadata" field={field} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insurance Info */}
                {data.additional_information.insurance_info && Object.keys(data.additional_information.insurance_info).length > 0 && (
                  <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-500" /> Insurance Information
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['claim_number', 'policy_number', 'provider'].map(field => (
                        <div key={field} className="relative">
                          <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
                          <input type="text" value={strVal((data.additional_information?.insurance_info as any)?.[field])} 
                            onChange={e => handleDeepNestedChange('additional_information', 'insurance_info', field, e.target.value)}
                            readOnly={isReadOnly}
                            className={getDeepInputClass('additional_information', 'insurance_info', field)} />
                          <DeepCorrectionIndicator section="additional_information" subSection="insurance_info" field={field} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hospital Info */}
                {data.additional_information.hospital_info && Object.keys(data.additional_information.hospital_info).length > 0 && (
                  <div className="bg-rose-50/50 p-4 rounded-lg border border-rose-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-rose-500" /> Hospital Details
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['ward', 'bed_number', 'room_number', 'admission_date', 'discharge_date'].map(field => (
                        <div key={field} className="relative">
                          <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
                          <input type="text" value={strVal((data.additional_information?.hospital_info as any)?.[field])} 
                            onChange={e => handleDeepNestedChange('additional_information', 'hospital_info', field, e.target.value)}
                            readOnly={isReadOnly}
                            className={getDeepInputClass('additional_information', 'hospital_info', field)} />
                          <DeepCorrectionIndicator section="additional_information" subSection="hospital_info" field={field} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prescription Info */}
                {data.additional_information.prescription_info && Object.keys(data.additional_information.prescription_info).length > 0 && (
                  <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-500" /> Prescription Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {['prescription_number', 'referral_details'].map(field => (
                        <div key={field} className="relative">
                          <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
                          <input type="text" value={strVal((data.additional_information?.prescription_info as any)?.[field])} 
                            onChange={e => handleDeepNestedChange('additional_information', 'prescription_info', field, e.target.value)}
                            readOnly={isReadOnly}
                            className={getDeepInputClass('additional_information', 'prescription_info', field)} />
                          <DeepCorrectionIndicator section="additional_information" subSection="prescription_info" field={field} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted Notes */}
                {data.additional_information.extracted_notes && data.additional_information.extracted_notes.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4 text-slate-500" /> Extracted Notes
                    </h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {data.additional_information.extracted_notes.map((note, idx) => (
                        <li key={idx} className="text-sm text-slate-600 leading-relaxed">{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
