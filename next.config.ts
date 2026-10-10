import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Permite subir el logo del negocio (hasta ~1,5 MB) por server action
    serverActions: { bodySizeLimit: "2mb" },
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
