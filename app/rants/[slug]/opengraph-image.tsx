import { notFound } from "next/navigation"

import { ogSize, renderPageOgImage } from "@/lib/og-image"
import { getPublishedRantBySlug } from "@/lib/rants/db"

export const alt = "A Rant by Tomiwa David"
export const size = ogSize
export const contentType = "image/png"

export default async function RantOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const rant = await getPublishedRantBySlug(slug)
  if (!rant) notFound()
  return renderPageOgImage({
    title: rant.title,
    description: rant.excerpt,
    path: `daaysorn.com/rants/${rant.slug}`,
    labels: [...rant.tags, `${rant.readingMinutes} min`].slice(0, 4),
  })
}
