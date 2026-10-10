export type Unit = "g" | "m" | "u" | "ml";
export type OrderStatus = "espera" | "proceso" | "calidad" | "enviado";
export type TransactionType = "ingreso" | "gasto";

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
  customers?: Pick<Customer, "name" | "whatsapp" | "instagram" | "address"> | null;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  category: string;
  description: string | null;
  amount: number;
  payment_method: string | null;
  occurred_on: string;
};
