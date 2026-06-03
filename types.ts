export type UserRole = 'admin' | 'reviewer' | 'viewer' | 'api_only';

export type NavSection = 
  | 'dashboard' 
  | 'batches' 
  | 'bills' 
  | 'review_queue' 
  | 'analytics' 
  | 'vendors' 
  | 'exports' 
  | 'api' 
  | 'audit_logs' 
  | 'settings';

export interface SecuritySettings {
  two_factor_enabled: boolean;
  ip_allowlist: string[];
  session_timeout_minutes: number;
  data_retention_days: number;
}

export interface Session {
  id: string;
  user_id: string;
  device: string;
  ip_address: string;
  last_active: string;
  is_current: boolean;
}

export interface SecurityAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface Organization {
  id: string;
  name: string;
  subscription_plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'suspended';
  created_at: string;
  security_settings?: SecuritySettings;
}

// --- Billing & Usage Types ---

export interface PlanLimits {
  bills_per_month: number;
  pages_per_month: number;
  api_calls_per_month: number;
  users: number;
  data_retention_days: number;
}

export interface Plan {
  id: string;
  tier: 'free' | 'pro' | 'enterprise';
  name: string;
  price: number;
  limits: PlanLimits;
  features: string[];
}

export interface UsageMetrics {
  period_start: string;
  period_end: string;
  bills_processed: number;
  pages_processed: number;
  api_calls: number;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  pdf_url?: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'inactive';
  created_at: string;
  avatar_url?: string;
}

export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string; // e.g., 'auth', 'bill_123'
  timestamp: string;
  metadata?: any;
}

export interface BatchSettings {
  priority: 'normal' | 'high';
  auto_review: boolean;
  auto_export: boolean;
}

export interface Batch {
  id: string;
  org_id: string;
  created_by: string;
  created_at: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'partial';
  total_bills: number;
  processed_bills: number;
  avg_confidence: number;
  settings: BatchSettings;
}

export interface Correction {
  id: string;
  field_path: string; // e.g. "totals.grand_total"
  original_value: any;
  corrected_value: any;
  user_id: string;
  timestamp: string;
}

export interface FraudFlag {
  id: string;
  bill_id: string;
  signal_type: 'duplicate' | 'amount_anomaly' | 'structural_tampering' | 'vendor_risk';
  severity: 'low' | 'medium' | 'high';
  description: string;
  created_at: string;
  status: 'active' | 'resolved' | 'ignored';
  resolved_by?: string;
  resolution_note?: string;
}

export interface Bill {
  id: string;
  org_id: string;
  batch_id: string;
  file_name: string;
  file_type: string;
  page_count: number;
  status: 'queued' | 'processing' | 'completed' | 'needs_review' | 'failed';
  confidence_score: number;
  error_reason?: string;
  created_at: string;
  sla_deadline?: string; // ISO Date string for Review Queue prioritization
  file_url: string; // Object URL for preview
  extracted_data?: BillData;
  original_data?: BillData; // Immutable snapshot of initial OCR
  corrections?: Correction[];
  flags?: ('low_confidence' | 'fraud_risk' | 'data_mismatch' | 'missing_fields')[];
  fraud_signals?: FraudFlag[]; // Detailed fraud signals
  vendor_id?: string; // Link to Vendor Intelligence
}

export interface ExportJob {
  id: string;
  org_id: string;
  requested_by: string;
  scope: 'bill' | 'selected' | 'batch';
  format: 'json' | 'csv' | 'excel';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  item_count: number;
  file_url?: string;
  file_name: string;
  created_at: string;
  completed_at?: string;
  error?: string;
}

export interface VendorStats {
    vendor_name: string;
    total_bills: number;
    corrected_bills: number;
    trust_score: number; // 0-100
    field_accuracies: Record<string, number>; // field_path -> % accuracy
    top_errors: string[];
}

export interface Vendor {
  id: string;
  org_id: string;
  name: string;
  gstin?: string;
  address?: string;
  trust_score: number; // 0-100
  total_bills: number;
  auto_approved_bills: number;
  created_at: string;
  last_active: string;
  status: 'active' | 'review' | 'blocked';
}


// --- Integrations Types ---

export type WebhookEvent = 'bill.ocr.completed' | 'bill.needs_review' | 'bill.approved' | 'export.completed' | 'fraud.flagged' | 'ping';

export interface ApiKey {
  id: string;
  org_id: string;
  name: string;
  prefix: string; // masked key for display "pk_live_...X8d9"
  key_hash: string; // in real app, we store hash
  scopes: ('read' | 'write' | 'admin')[];
  status: 'active' | 'revoked';
  created_at: string;
  last_used_at?: string;
}

export interface Webhook {
  id: string;
  org_id: string;
  url: string;
  events: WebhookEvent[];
  secret: string; // signing secret
  status: 'active' | 'inactive' | 'failing';
  created_at: string;
  failure_count: number;
}

export interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: WebhookEvent;
  payload: any;
  status_code: number; // 200, 400, 500
  response_body?: string;
  timestamp: string;
}

export interface SortConfig {
  key: keyof Bill | 'vendor' | 'amount' | 'date';
  direction: 'asc' | 'desc';
}

export interface SellerInfo {
  supplier_name: string | null;
  supplier_address: string | null;
  supplier_phone: string | null;
  supplier_email: string | null;
  gst_number: string | null;
  druglicense_number: string | null;
  pan_number: string | null;
}

export interface BuyerInfo {
  name: string | null;
  address: string | null;
  gstin: string | null;
  phone: string | null;
}

export interface InvoiceDetails {
  invoice_number: string | null;
  invoice_datetime: string | null;
  duedate: string | null;
  reference_number: string | null;
  invoice_type: string | null; // "cash" | "credit"
}

export interface BankDetails {
  bank_name: string | null;
  account_no: string | null;
  ifsc_code: string | null;
  branch: string | null;
  account_holder_name: string | null;
}

export interface InvoiceItem {
  sr_no: number | null;
  hsn_code: string | null;
  product_name: string | null;
  manufacturer: string | null;
  batch_no: string | null;
  expiry_date: string | null;
  quantity: number | null;
  pack_size: string | null;
  free: number | null; // or null
  mrp: number | null;
  rate: number | null;
  gross_value: number | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  taxable_amount: number | null;
  cgst_percentage: number | null;
  cgst_amount: number | null;
  sgst_percentage: number | null;
  sgst_amount: number | null;
  total: number | null;
}

export interface Totals {
  total_items: number | null;
  total_mrp: number | null;
  total_discount_amount: number | null;
  total_taxable_value: number | null;
  total_cgst: number | null;
  total_sgst: number | null;
  grand_total: number | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>; // field_key -> error messages
  warnings: Record<string, string[]>;
}

// --- Notification Types ---

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string; // ISO string, displayed in IST
  type: NotificationType;
  read: boolean;
}

// --- Additional Information Types ---

export interface DoctorInfo {
  name?: string | null;
  registration_number?: string | null;
  department?: string | null;
}

export interface PatientMetadata {
  uhid?: string | null;
  patient_id?: string | null;
  age?: string | null;
  gender?: string | null;
  registration_number?: string | null;
}

export interface PrescriptionInfo {
  prescription_number?: string | null;
  referral_details?: string | null;
}

export interface InsuranceInfo {
  claim_number?: string | null;
  policy_number?: string | null;
  provider?: string | null;
}

export interface HospitalInfo {
  ward?: string | null;
  bed_number?: string | null;
  room_number?: string | null;
  admission_date?: string | null;
  discharge_date?: string | null;
}

export interface AdditionalInformation {
  doctor_info?: DoctorInfo;
  patient_metadata?: PatientMetadata;
  prescription_info?: PrescriptionInfo;
  insurance_info?: InsuranceInfo;
  hospital_info?: HospitalInfo;
  other?: Record<string, any>;
  extracted_notes?: string[]; // Unmapped but useful extracted text (Suggestion 3)
}

export interface BillData {
  org_id?: string; // Tying data to tenant
  uploaded_by?: string; // Tying data to user
  seller_info: SellerInfo;
  buyer_info: BuyerInfo;
  invoice_details: InvoiceDetails;
  bank_details: BankDetails;
  invoice_items: InvoiceItem[];
  totals: Totals;
  other_details: Record<string, any>;
  confidence_score: number;
  additional_information?: AdditionalInformation;
  validation_results?: ValidationResult;
  processing_metadata?: {
    stages: Record<string, 'pending' | 'success' | 'failed' | 'skipped'>;
    timestamps: Record<string, number>;
  };
}

export type ProcessingStep = {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed';
};



// Analytics Types
export type DateRange = '30d' | '90d' | '1y' | 'all';

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}
