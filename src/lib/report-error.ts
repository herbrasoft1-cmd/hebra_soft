/**
 * Único punto por el que pasan los errores no capturados de la UI. Hoy solo registra en consola;
 * el día que haya una cuenta de monitoreo (ej. Sentry), conectar monitoreo real es cambiar esta
 * función, no cada pantalla que la usa.
 */
export function reportError(error: Error & { digest?: string }, context: string) {
  console.error(`[${context}]`, error);
}
