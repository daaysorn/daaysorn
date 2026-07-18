import type { Metadata } from "next"

import { KeepsView } from "@/components/keeps/keeps-view"
import { listKeeps } from "@/lib/keeps/db"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Keeps",
  description:
    "Browse posts, articles, videos, and ideas kept and summarized by Tomiwa David.",
}

export default async function KeepsPage() {
  const keeps = await listKeeps()

  return <KeepsView initialKeeps={keeps} />
}
