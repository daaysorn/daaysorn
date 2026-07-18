import { ogSize, renderPageOgImage } from "@/lib/og-image"

export const alt =
  "Keeps by Tomiwa David, a collection of posts, articles, videos, and ideas"
export const size = ogSize
export const contentType = "image/png"

export default function KeepsTwitterImage() {
  return renderPageOgImage({
    title: "Keeps",
    description: "Posts, articles, videos, and ideas I found worth keeping.",
    path: "daaysorn.com/keeps",
    labels: ["All", "Articles", "Videos", "Ideas"],
  })
}
