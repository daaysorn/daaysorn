import { createPageOgImage } from "@/lib/og-page"

const og = createPageOgImage({
  title: "Gallery",
  description: "Moments from my life, work, and everything in between.",
  path: "/gallery",
  labels: ["Life", "Work", "Design", "Moments"],
  alt: "Gallery by Tomiwa David, moments from life, work, and everything in between",
})

export const alt = og.alt
export const size = og.size
export const contentType = og.contentType
export default og.Image
