import type { getSession } from "./tenant";

type Supabase = Awaited<ReturnType<typeof getSession>>["supabase"];

/**
 * Registra un evento de auditoría (equipo, configuración, eliminaciones). No lanza si falla:
 * un problema al auditar no debe tumbar la acción principal que se estaba registrando.
 */
export async function logAudit(
  supabase: Supabase,
  params: { tenantId: string; action: string; entityType: string; entityId?: string; metadata?: Record<string, unknown> },
) {
  const { error } = await supabase.rpc("log_audit", {
    p_tenant_id: params.tenantId,
    p_action: params.action,
    p_entity_type: params.entityType,
    p_entity_id: params.entityId ?? null,
    p_metadata: params.metadata ?? {},
  });
  if (error) console.error("logAudit failed:", error.message);
}
