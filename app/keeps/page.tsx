import type { Metadata } from "next"

import { KeepsView } from "@/components/keeps/keeps-view"
import { listKeeps } from "@/lib/keeps/db"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Keeps",
  description:
    "Browse posts, articles, videos, and ideas kept and summarized by Tomiwa David.",
  alternates: { canonical: "/keeps" },
  openGraph: {
    type: "website",
    url: "/keeps",
    title: "Keeps | daaysorn",
    description:
      "Browse posts, articles, videos, and ideas kept and summarized by Tomiwa David.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Keeps | daaysorn",
    description:
      "Browse posts, articles, videos, and ideas kept and summarized by Tomiwa David.",
    creator: "@daaysorn",
  },
}

export default async function KeepsPage() {
  const keeps = await listKeeps()

  return <KeepsView initialKeeps={keeps} />
}
