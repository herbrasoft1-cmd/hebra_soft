import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Config mínima: sin caché R2 para ISR (no es necesaria todavía — HEBRA no usa
 * revalidate/ISR hoy, todo es render dinámico por tenant). Si en el futuro se agrega
 * una página con `revalidate`, se puede sumar `incrementalCache` con un bucket R2
 * (ver https://opennext.js.org/cloudflare/caching).
 */
export default defineCloudflareConfig();
