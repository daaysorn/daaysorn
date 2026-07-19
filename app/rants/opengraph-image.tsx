import { ogSize, renderPageOgImage } from "@/lib/og-image"

export const alt = "Rants by Tomiwa David"
export const size = ogSize
export const contentType = "image/png"

export default function RantsOpenGraphImage() {
  return renderPageOgImage({
    title: "Rants",
    description: "Thoughts, questions, and unfinished conclusions.",
    path: "daaysorn.com/rants",
    labels: ["Design", "Faith", "Building", "Life"],
  })
}
