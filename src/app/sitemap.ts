import type { MetadataRoute } from "next";

/** Solo las páginas públicas pensadas para indexarse — ver robots.ts. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://hebrasoft.com";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${base}/privacidad`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];
}
