"use client"

import { useRef, type ReactNode } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import { useInitialPageLoad } from "@/components/page-transition-context"

gsap.registerPlugin(useGSAP)

export default function Template({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInitialPageLoad = useInitialPageLoad()

  useGSAP(
    () => {
      const targets = containerRef.current?.children
      if (!targets?.length) return

      if (isInitialPageLoad) {
        containerRef.current?.classList.remove("page-transition-pending")
        return
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches

      containerRef.current?.classList.remove("page-transition-pending")

      if (!reduceMotion) {
        gsap.fromTo(
          targets,
          { autoAlpha: 0, y: 14 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.04,
            ease: "power3.out",
            willChange: "transform, opacity",
            clearProps: "transform,opacity,visibility,willChange",
          }
        )
      }
    },
    { scope: containerRef }
  )

  return (
    <div ref={containerRef} className="page-transition-pending contents">
      {children}
    </div>
  )
}
