import type { MetadataRoute } from "next";

/** HEBRA es de uso privado: solo la portada y la política de privacidad son
 * páginas públicas pensadas para indexarse. Todo lo demás es transaccional
 * (login, invitación, registro) o requiere sesión — no tiene sentido en resultados
 * de búsqueda, y el portal de seguimiento lleva un token único por cliente, así
 * que jamás debe indexarse. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacidad"],
      disallow: [
        "/login",
        "/registro",
        "/invitar",
        "/invitar/",
        "/auth/",
        "/bienvenida",
        "/seguimiento/",
        "/inicio",
        "/pedidos",
        "/insumos",
        "/recetario",
        "/clientes",
        "/caja",
        "/finanzas",
        "/analitica",
        "/configuracion",
        "/ayuda",
      ],
    },
    sitemap: "https://hebrasoft.com/sitemap.xml",
  };
}
