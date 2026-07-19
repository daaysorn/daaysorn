import { ogSize, renderPageOgImage } from "@/lib/og-image"

export const alt =
  "Gallery by Tomiwa David, moments from life, work, and everything in between"
export const size = ogSize
export const contentType = "image/png"

export default function GalleryOpenGraphImage() {
  return renderPageOgImage({
    title: "Gallery",
    description: "Moments from my life, work, and everything in between.",
    path: "daaysorn.com/gallery",
    labels: ["Life", "Work", "Design", "Moments"],
  })
}
