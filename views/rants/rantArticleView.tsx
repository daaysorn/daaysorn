import { notFound } from "next/navigation"

import { RantArticle } from "@/components/rants/rant-article"
import {
  getPublishedRantBySlug,
  getRantById,
  listApprovedPerspectives,
} from "@/lib/rants/db"
import { validRantPreviewToken } from "@/lib/rants/preview"

export async function RantArticleView({ slug }: { slug: string }) {
  const rant = await getPublishedRantBySlug(slug)
  if (!rant) notFound()
  const perspectives = await listApprovedPerspectives(rant.id)
  return <RantArticle rant={rant} perspectives={perspectives} />
}

export async function RantPreviewView({
  id,
  token,
}: {
  id: string
  token: string
}) {
  if (!validRantPreviewToken(id, token)) notFound()
  const rant = await getRantById(id)
  if (!rant) notFound()
  return <RantArticle rant={rant} perspectives={[]} preview />
}
