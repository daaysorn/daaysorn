import type { Metadata } from "next"

import { PrivacyView } from "@/views"
import { siteConfig } from "@/lib/seo"

const title = "Privacy Policy"
const description = `How ${siteConfig.name} collects, uses, and protects information when you visit the Site, contribute to Rants, use Keeps, or otherwise interact with our surfaces.`

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title,
    description,
    url: "/privacy",
    type: "website",
  },
  twitter: {
    title,
    description,
  },
}

export default function PrivacyPage() {
  return <PrivacyView />
}
