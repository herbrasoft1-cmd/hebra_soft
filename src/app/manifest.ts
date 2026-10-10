import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HEBRA · Gestión para negocios handmade",
    short_name: "HEBRA",
    description: "Costea, organiza y cobra lo que tejes.",
    id: "/",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FDFBF7",
    theme_color: "#A85B45",
    lang: "es-CO",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Registrar venta", url: "/inicio?accion=venta", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Pedidos", url: "/pedidos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
