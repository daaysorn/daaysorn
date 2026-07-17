import type { MetadataRoute } from "next"

import { siteConfig } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  const publicRules = {
    allow: "/",
    disallow: "/api/",
  }

  return {
    rules: [
      { userAgent: "*", ...publicRules },
      { userAgent: "OAI-SearchBot", ...publicRules },
      { userAgent: "ChatGPT-User", ...publicRules },
      { userAgent: "GPTBot", ...publicRules },
      { userAgent: "ClaudeBot", ...publicRules },
      { userAgent: "Claude-SearchBot", ...publicRules },
      { userAgent: "Claude-User", ...publicRules },
      { userAgent: "PerplexityBot", ...publicRules },
      { userAgent: "Perplexity-User", ...publicRules },
      { userAgent: "Google-Extended", ...publicRules },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  }
}
