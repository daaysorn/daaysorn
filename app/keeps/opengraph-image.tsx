import { createPageOgImage } from "@/lib/og-page"

const og = createPageOgImage({
  title: "Keeps",
  description: "Posts, articles, videos, and ideas I found worth keeping.",
  path: "/keeps",
  labels: ["All", "Articles", "Videos", "Ideas"],
  alt: "Keeps by Tomiwa David, a collection of posts, articles, videos, and ideas",
})

export const alt = og.alt
export const size = og.size
export const contentType = og.contentType
export default og.Image
