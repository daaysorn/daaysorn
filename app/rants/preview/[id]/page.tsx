import type { Metadata } from "next"
import { RantPreviewView } from "@/views"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

export const metadata: Metadata = {
  title: "Rant draft preview",
  robots: { index: false, follow: false },
}

export default async function RantPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const token = typeof query.token === "string" ? query.token : ""
  return <RantPreviewView id={id} token={token} />
}
