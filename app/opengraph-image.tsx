import { renderOgImage } from "@/lib/og-image"

export const alt = "daaysorn by Tomiwa David, Founder, Designer, and Builder"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default function OpenGraphImage() {
  return renderOgImage("light-swiss")
}
