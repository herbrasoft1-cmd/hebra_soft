-- =============================================================================
-- HEBRA · Correo opcional del cliente, para poder avisarle por email cuando su
-- pedido se envía (además del link de seguimiento que ya existe). Mismo patrón
-- que document_number en 0014_finanzas.sql: columna nullable, sin backfill
-- porque no hay forma honesta de inventar un correo que nadie cargó.
-- =============================================================================

alter table customers add column email text;
