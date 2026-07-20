import type { Metadata } from "next"

import { TermsView } from "@/views"
import { siteConfig } from "@/lib/seo"

const title = "Terms of Service"
const description = `The rules for using ${siteConfig.name}—including acceptable use, user contributions, intellectual property, and limitations of liability.`

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title,
    description,
    url: "/terms",
    type: "website",
  },
  twitter: {
    title,
    description,
  },
}

export default function TermsPage() {
  return <TermsView />
}
