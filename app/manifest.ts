import type { MetadataRoute } from "next"

import { siteConfig } from "@/lib/seo"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${siteConfig.name} | ${siteConfig.creator.name}`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    lang: "en-NG",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["design", "business", "technology"],
    icons: [
      {
        src: "/icons/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Keeps",
        short_name: "Keeps",
        description: "Open saved posts, articles, videos, and ideas.",
        url: "/keeps",
        icons: [{ src: "/icons/pwa-192.png", sizes: "192x192" }],
      },
      {
        name: "Gallery",
        short_name: "Gallery",
        description: "Open the daaysorn Gallery.",
        url: "/gallery",
        icons: [{ src: "/icons/pwa-192.png", sizes: "192x192" }],
      },
    ],
  }
}
