import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Permite que `next dev` lea bindings/secrets de Cloudflare (ej. RESEND_API_KEY desde .dev.vars)
// a través de getCloudflareContext(), igual que en el Worker real. No bloqueante (no se "awaitea").
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  experimental: {
    // Permite subir el logo del negocio (hasta ~1,5 MB) por server action
    serverActions: { bodySizeLimit: "2mb" },
  },
  images: {
    // El optimizador de imágenes de Next necesita el runtime de Vercel o el binding
    // "Images" de Cloudflare (tiene costo aparte). Se desactiva para desplegar en
    // Cloudflare Workers sin esa dependencia; las fotos (avatares, logo, avance de
    // pedido) ya se suben pre-comprimidas. Se puede reactivar sumando el binding
    // "images" en wrangler.jsonc si hace falta más adelante.
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // El service worker no debe quedar en caché para que las actualizaciones lleguen.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
