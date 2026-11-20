// Multi-Tenant Retail Inventory & POS Management SaaS Types

export type PlanType = 'STARTER' | 'GROWTH' | 'ENTERPRISE';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'TENANT_OWNER'
  | 'BRANCH_MANAGER'
  | 'CASHIER'
  | 'INVENTORY_CLERK';

export interface TaxConfig {
  enabled: boolean;
  inclusive: boolean;
  default_rate: number; // e.g. 7.5 (%)
  tax_id_label: string; // "VAT", "GST", "Sales Tax"
}

export interface TenantSettings {
  currency_code: 'USD' | 'BDT' | 'EUR' | 'INR' | 'GBP';
  currency_symbol: string;
  timezone: string;
  tax_config: TaxConfig;
  low_stock_threshold_default: number;
  receipt_footer_text: string;
  allow_negative_stock: boolean;
  batch_tracking_enabled: boolean;
}

export interface TenantPlanLimits {
  max_branches: number;
  max_skus: number;
  max_staff: number;
  batch_tracking: boolean;
  api_access: boolean;
}

export interface Tenant {
  id: string; // UUIDv7
  name: string;
  slug: string;
  plan: PlanType;
  status: 'ACTIVE' | 'SUSPENDED';
  settings: TenantSettings;
  created_at: string;
}

export interface Branch {
  id: string; // UUID
  tenant_id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  is_main: boolean;
}

export interface User {
  id: string;
  tenant_id: string;
  branch_id?: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  barcode: string;
  name: string; // e.g. "Size: L / Color: Black"
  cost_price: number;
  retail_price: number;
}

export interface ProductBatch {
  id: string;
  product_id: string;
  branch_id: string;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string; // ISO date
  quantity: number;
  cost_price: number;
}

export interface Product {
  id: string;
  tenant_id: string;
  sku: string;
  barcode: string;
  name: string;
  category_id: string;
  category_name?: string;
  unit_of_measure: 'pcs' | 'kg' | 'liter' | 'box' | 'meter';
  cost_price: number;
  retail_price: number;
  reorder_level: number;
  image_url?: string;
  has_variants: boolean;
  track_batch_expiry: boolean;
  variants?: ProductVariant[];
  batches?: ProductBatch[];
  stock_by_branch: Record<string, number>; // branch_id -> quantity_on_hand
}

export type StockMovementType =
  | 'PURCHASE_IN'
  | 'SALE_OUT'
  | 'RETURN_IN'
  | 'DAMAGE_OUT'
  | 'ADJUSTMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';

export interface StockLedgerEntry {
  id: string;
  tenant_id: string;
  branch_id: string;
  branch_name?: string;
  product_id: string;
  product_name?: string;
  sku: string;
  variant_id?: string;
  movement_type: StockMovementType;
  quantity_delta: number;
  balance_after: number;
  cost_price_at_time: number;
  reference_id: string; // sale_id, po_id, transfer_id, etc.
  notes: string;
  created_by_user: string;
  created_at: string;
}

export interface SaleItem {
  id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  sku: string;
  barcode: string;
  unit_price: number;
  cost_price: number;
  quantity: number;
  total_price: number;
  batch_number?: string;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE' | 'CREDIT';

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface Sale {
  id: string;
  tenant_id: string;
  branch_id: string;
  invoice_number: string;
  idempotency_key: string;
  cashier_id: string;
  cashier_name: string;
  customer_name?: string;
  customer_phone?: string;
  items: SaleItem[];
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  tax_amount: number;
  tax_rate: number;
  total_amount: number;
  payments: PaymentEntry[];
  change_given: number;
  status: 'COMPLETED' | 'REFUNDED' | 'VOIDED';
  created_at: string;
}

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  balance_payable: number;
}

export interface PurchaseOrderItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  batch_number?: string;
  expiry_date?: string;
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  branch_id: string;
  branch_name?: string;
  supplier_id: string;
  supplier_name: string;
  po_number: string;
  status: 'DRAFT' | 'ORDERED' | 'PARTIAL_RECEIVED' | 'COMPLETED';
  items: PurchaseOrderItem[];
  total_cost: number;
  notes?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name: string;
  action:
    | 'MANUAL_PRICE_OVERRIDE'
    | 'HIGH_DISCOUNT_APPLIED'
    | 'STOCK_ADJUSTMENT'
    | 'BRANCH_TRANSFER'
    | 'SALE_VOIDED'
    | 'STOCK_RECEIVED_GRN';
  details: string;
  old_value?: string;
  new_value?: string;
  ip_address: string;
  created_at: string;
}
