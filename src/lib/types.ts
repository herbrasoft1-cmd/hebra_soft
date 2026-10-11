export type Unit = "g" | "m" | "u" | "ml";
export type OrderStatus = "espera" | "proceso" | "calidad" | "enviado";
export type TransactionType = "ingreso" | "gasto";
export type Role = "owner" | "admin" | "ventas" | "tejedora";

export type Location = {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
};

export type Membership = {
  user_id: string;
  email: string;
  role: Role;
  joined_at: string;
  location_id: string | null;
  location_name: string | null;
};

export type Invitation = {
  id: string;
  tenant_id: string;
  email: string;
  role: Role;
  location_id: string | null;
  token: string;
  invited_by: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
};

export type Tenant = {
  id: string;
  name: string;
  industry: string;
  hourly_rate: number;
  tool_wear_pct: number;
  currency: string;
  logo_url: string | null;
  whatsapp: string | null;
  instagram: string | null;
};

export type Supply = {
  id: string;
  tenant_id: string;
  name: string;
  brand: string | null;
  lot_color: string | null;
  unit: Unit;
  quantity_purchased: number;
  quantity_remaining: number;
  total_cost: number;
  unit_cost: number;
  low_stock_threshold: number;
  location_id: string | null;
  supplier_id: string | null;
};

export type Product = {
  id: string;
  tenant_id: string;
  name: string;
  category: string | null;
  notes: string | null;
  labor_seconds: number;
  target_margin_pct: number;
  sale_price: number | null;
};

export type SalesChannel = {
  id: string;
  tenant_id: string;
  name: string;
  commission_pct: number;
  fixed_fee: number;
};

export type ProductVersion = {
  id: string;
  product_id: string;
  version_number: number;
  materials_cost: number;
  labor_cost: number;
  wear_cost: number;
  hourly_rate: number;
  labor_seconds: number;
  channel_name: string | null;
  commission_pct: number;
  fixed_fee: number;
  margin_pct: number;
  iva_included: boolean;
  net_price: number;
  created_at: string;
  created_by: string | null;
};

export type ProductSupply = {
  id: string;
  product_id: string;
  supply_id: string;
  quantity: number;
  supplies: Pick<Supply, "id" | "name" | "unit" | "unit_cost" | "quantity_remaining" | "lot_color">;
};

export type Customer = {
  id: string;
  tenant_id: string;
  name: string;
  whatsapp: string | null;
  instagram: string | null;
  address: string | null;
};

export type Order = {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  product_id: string | null;
  title: string;
  details: string | null;
  quantity: number;
  price: number;
  status: OrderStatus;
  due_date: string | null;
  paid: boolean;
  location_id: string | null;
  channel: string | null;
  created_at: string;
  assigned_to: string | null;
  customers?: Pick<Customer, "name" | "whatsapp" | "instagram" | "address"> | null;
};

export type Availability = {
  id: string;
  tenant_id: string;
  user_id: string;
  weekday: number; // 0 = lunes .. 6 = domingo
  hours: number;
};

export type Supplier = {
  id: string;
  tenant_id: string;
  name: string;
  contact: string | null;
};

export type SupplyLot = {
  id: string;
  supply_id: string;
  supplier_id: string | null;
  lot_code: string | null;
  quantity_received: number;
  unit_cost: number;
  received_at: string;
  purchase_order_id: string | null;
  created_at: string;
};

export type PurchaseOrderStatus = "borrador" | "por_aprobar" | "en_transito" | "recibida";

export type PurchaseOrderLine = {
  id: string;
  purchase_order_id: string;
  supply_id: string;
  quantity: number;
  unit_cost: number;
  supplies?: Pick<Supply, "name" | "unit"> | null;
};

export type PurchaseOrder = {
  id: string;
  tenant_id: string;
  location_id: string | null;
  supplier_id: string | null;
  status: PurchaseOrderStatus;
  notes: string | null;
  auto_created: boolean;
  created_at: string;
  approved_at: string | null;
  received_at: string | null;
  purchase_order_lines?: PurchaseOrderLine[];
  suppliers?: Pick<Supplier, "name"> | null;
  locations?: Pick<Location, "name"> | null;
};

export type StockTransfer = {
  id: string;
  tenant_id: string;
  from_supply_id: string;
  to_location_id: string;
  quantity: number;
  status: "pendiente" | "completada";
  created_at: string;
  completed_at: string | null;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  category: string;
  description: string | null;
  amount: number;
  payment_method: string | null;
  occurred_on: string;
  location_id: string | null;
};
