import { createPageOgImage } from "@/lib/og-page"

const og = createPageOgImage({
  title: "Privacy Policy",
  description: "How daaysorn collects, uses, and protects information.",
  path: "/privacy",
  labels: ["Legal", "Privacy", "Data"],
  alt: "Privacy Policy | daaysorn",
})

export const alt = og.alt
export const size = og.size
export const contentType = og.contentType
export default og.Image
