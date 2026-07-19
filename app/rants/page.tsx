import type { Metadata } from "next"

import { RantsView } from "@/views"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

export const metadata: Metadata = {
  title: "Rants",
  description:
    "Thoughts, questions, and unfinished conclusions from Tomiwa David.",
  alternates: { canonical: "/rants" },
  openGraph: {
    type: "website",
    url: "/rants",
    title: "Rants | daaysorn",
    description:
      "Thoughts, questions, and unfinished conclusions from Tomiwa David.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rants | daaysorn",
    description:
      "Thoughts, questions, and unfinished conclusions from Tomiwa David.",
    creator: "@daaysorn",
  },
}

export default function RantsPage() {
  return <RantsView />
}
