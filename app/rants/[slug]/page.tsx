import type { Metadata } from "next"
import { getPublishedRantBySlug } from "@/lib/rants/db"
import { RantArticleView } from "@/views"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const rant = await getPublishedRantBySlug(slug)
  if (!rant) return { title: "Rant not found" }
  const path = `/rants/${rant.slug}`
  return {
    title: rant.title,
    description: rant.seoDescription,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: rant.title,
      description: rant.seoDescription,
      publishedTime: rant.publishedAt ?? undefined,
      modifiedTime: rant.updatedAt,
      authors: ["Tomiwa David"],
      tags: rant.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: rant.title,
      description: rant.seoDescription,
      creator: "@daaysorn",
    },
  }
}

export default async function RantPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <RantArticleView slug={slug} />
}
