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
    dir: "ltr",
    orientation: "any",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    launch_handler: {
      client_mode: "focus-existing",
    },
    prefer_related_applications: false,
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["design", "business", "technology"],
    screenshots: [
      {
        src: "/screenshots/home-wide.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "daaysorn home on desktop",
      },
      {
        src: "/screenshots/home-narrow.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: "daaysorn home on mobile",
      },
    ],
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
        icons: [{ src: "/icons/pwa-96.png", sizes: "96x96" }],
      },
      {
        name: "Gallery",
        short_name: "Gallery",
        description: "Open the daaysorn Gallery.",
        url: "/gallery",
        icons: [{ src: "/icons/pwa-96.png", sizes: "96x96" }],
      },
    ],
  }
}
