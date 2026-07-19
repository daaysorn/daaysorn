import type { Metadata } from "next"

import { GalleryView } from "@/views"

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "A visual collection of moments from Tomiwa David's life and work.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    type: "website",
    url: "/gallery",
    title: "Gallery | daaysorn",
    description:
      "A visual collection of moments from Tomiwa David's life and work.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gallery | daaysorn",
    description:
      "A visual collection of moments from Tomiwa David's life and work.",
    creator: "@daaysorn",
  },
}

export default function GalleryPage() {
  return <GalleryView />
}
