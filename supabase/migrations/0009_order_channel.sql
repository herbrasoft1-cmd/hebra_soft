-- =============================================================================
-- HEBRA · Fase 2 Enterprise: canal de venta del pedido, para "Ventas por canal"
-- del panel ejecutivo. Aditiva: columna nullable, sin backfill — los pedidos que
-- ya existen quedan con channel = null ("Sin canal"), no se les inventa un valor.
-- =============================================================================

alter table orders add column channel text;
