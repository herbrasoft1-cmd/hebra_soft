import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/pwa";
import { themeInitScript } from "@/components/theme";
import "./globals.css";

const SITE_URL = "https://hebrasoft.com";
const DESCRIPTION = "Costea, organiza y cobra con el número real. Gestión integral para tu negocio.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "HEBRA", template: "%s · HEBRA" },
  description: DESCRIPTION,
  applicationName: "HEBRA",
  appleWebApp: { capable: true, title: "HEBRA", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: SITE_URL,
    siteName: "HEBRA",
    title: "HEBRA — Gestión integral de negocio",
    description: DESCRIPTION,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "HEBRA — El costo real de cada pieza, no una estimación." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HEBRA — Gestión integral de negocio",
    description: DESCRIPTION,
    images: ["/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDFBF7" },
    { media: "(prefers-color-scheme: dark)", color: "#231C19" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-dvh">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
