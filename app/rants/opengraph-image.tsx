import { createPageOgImage } from "@/lib/og-page"

const og = createPageOgImage({
  title: "Rants",
  description: "Thoughts, questions, and unfinished conclusions.",
  path: "/rants",
  labels: ["Design", "Faith", "Building", "Life"],
  alt: "Rants by Tomiwa David",
})

export const alt = og.alt
export const size = og.size
export const contentType = og.contentType
export default og.Image
