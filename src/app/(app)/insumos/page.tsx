import { Pager } from "@/components/pager";
import { PageHeader } from "@/components/ui/page-header";
import { blockedOrders, suggestTransfer, type LocationStock, type OrderWithRecipe } from "@/lib/inventory";
import { getActiveLocationId } from "@/lib/location";
import { getSession } from "@/lib/tenant";
import type { Location, PurchaseOrder, Supplier, Supply } from "@/lib/types";
import { getIndustryModule } from "@/modules";
import { SuppliesView } from "./supplies-view";

export const metadata = { title: "Insumos" };

const PAGE_SIZE = 50;

export default async function SuppliesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { supabase, tenant } = await getSession();
  const activeLocationId = await getActiveLocationId();

  let query = supabase.from("supplies").select("*", { count: "exact" }).eq("tenant_id", tenant.id);
  if (activeLocationId) query = query.eq("location_id", activeLocationId);

  const [{ data, count }, { data: allSupplies }, { data: suppliers }, { data: openPOs }, { data: activeOrders }, { data: locations }] =
    await Promise.all([
      query.order("name").range(from, to),
      supabase
        .from("supplies")
        .select("id, name, unit, location_id, quantity_remaining, unit_cost, low_stock_threshold, locations(name)")
        .eq("tenant_id", tenant.id),
      supabase.from("suppliers").select("*").eq("tenant_id", tenant.id).order("name"),
      supabase
        .from("purchase_orders")
        .select("*, suppliers(name), locations(name), purchase_order_lines(*, supplies(name, unit))")
        .eq("tenant_id", tenant.id)
        .neq("status", "recibida")
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id, title, quantity, status, location_id, product_id, products(product_supplies(quantity, supplies(name)))")
        .eq("tenant_id", tenant.id)
        .neq("status", "enviado")
        .not("product_id", "is", null),
      supabase.from("locations").select("*").eq("tenant_id", tenant.id).order("name"),
    ]);

  const mod = getIndustryModule(tenant.industry);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // KPIs: respetan la sede activa, igual que el resto de la app.
  const pageSupplies = activeLocationId ? (allSupplies ?? []).filter((s) => s.location_id === activeLocationId) : (allSupplies ?? []);
  const inventoryValue = pageSupplies.reduce((s, r) => s + Number(r.quantity_remaining) * Number(r.unit_cost), 0);
  const belowReorder = pageSupplies.filter((s) => Number(s.low_stock_threshold) > 0 && Number(s.quantity_remaining) <= Number(s.low_stock_threshold));
  const outOfStockCount = belowReorder.filter((s) => Number(s.quantity_remaining) <= 0).length;
  const openPOList = (openPOs ?? []) as unknown as PurchaseOrder[];
  const openPOAmount = openPOList.reduce(
    (s, po) => s + (po.purchase_order_lines ?? []).reduce((ls, l) => ls + Number(l.quantity) * Number(l.unit_cost), 0),
    0,
  );

  // Transferencia sugerida: siempre con datos de todas las sedes, sin importar el filtro activo.
  type AllSupplyRow = { id: string; name: string; unit: string; location_id: string | null; quantity_remaining: number; unit_cost: number; low_stock_threshold: number; locations: { name: string } | null };
  const allRows = (allSupplies ?? []) as unknown as AllSupplyRow[];
  const stock: LocationStock[] = allRows
    .filter((r) => r.location_id)
    .map((r) => ({
      locationId: r.location_id!,
      locationName: r.locations?.name ?? "",
      supplyId: r.id,
      supplyName: r.name,
      remaining: Number(r.quantity_remaining),
      threshold: Number(r.low_stock_threshold),
    }));
  const stockBySupplyAndLocation = new Map(stock.map((s) => [`${s.supplyName}\u0000${s.locationId}`, s.remaining]));

  type OrderRow = { id: string; title: string; quantity: number; status: string; location_id: string | null; products: { product_supplies: { quantity: number; supplies: { name: string } | null }[] } | null };
  const orderRows = (activeOrders ?? []) as unknown as OrderRow[];
  const ordersWithRecipe: OrderWithRecipe[] = orderRows.map((o) => ({
    id: o.id,
    title: o.title,
    locationId: o.location_id,
    status: o.status,
    quantity: o.quantity,
    lines: (o.products?.product_supplies ?? []).filter((l) => l.supplies).map((l) => ({ supplyName: l.supplies!.name, neededPerPiece: Number(l.quantity) })),
  }));
  const blocked = blockedOrders(ordersWithRecipe, stockBySupplyAndLocation);
  const transferSuggestion = suggestTransfer(stock, blocked);

  return (
    <>
      <PageHeader title="Insumos" subtitle="Lo que compras en volumen y usas por partes, por sede y por lote." />
      <SuppliesView
        supplies={(data ?? []) as Supply[]}
        units={mod.defaultUnits}
        examples={mod.supplyExamples}
        suppliers={(suppliers ?? []) as Supplier[]}
        inventoryValue={inventoryValue}
        referencesCount={pageSupplies.length}
        belowReorderCount={belowReorder.length}
        outOfStockCount={outOfStockCount}
        openPOCount={openPOList.length}
        openPOAmount={openPOAmount}
        suppliersCount={(suppliers ?? []).length}
        openPurchaseOrders={openPOList}
        transferSuggestion={transferSuggestion}
        allSupplyOptions={allRows.map((r) => ({ id: r.id, name: r.name, unit: r.unit, locationName: r.locations?.name ?? "" }))}
        locations={(locations ?? []) as Location[]}
      />
      <Pager page={page} totalPages={totalPages} basePath="/insumos" />
    </>
  );
}
