import { createPageOgImage } from "@/lib/og-page"

const og = createPageOgImage({
  title: "Terms of Service",
  description:
    "The rules for using daaysorn—acceptable use, contributions, and liability.",
  path: "/terms",
  labels: ["Legal", "Terms", "Use"],
  alt: "Terms of Service | daaysorn",
})

export const alt = og.alt
export const size = og.size
export const contentType = og.contentType
export default og.Image
