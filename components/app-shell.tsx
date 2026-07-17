"use client"

import { useRef, useState, type ReactNode } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

import { Footer, Header } from "@/components/nav"
import { InitialPageLoadProvider } from "@/components/page-transition-context"

gsap.registerPlugin(useGSAP)

export function AppShell({ children }: { children: ReactNode }) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [isInitialPageLoad, setIsInitialPageLoad] = useState(true)

  useGSAP(
    () => {
      const shell = shellRef.current
      if (!shell) return

      const [header, main, footer] = Array.from(shell.children)
      const pageElements = main?.firstElementChild
        ? Array.from(main.firstElementChild.children)
        : []
      const targets = [header, ...pageElements, footer].filter(Boolean)
      if (!targets.length) return

      const media = gsap.matchMedia()

      media.add(
        {
          allowMotion: "(prefers-reduced-motion: no-preference)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        ({ conditions }) => {
          if (conditions?.allowMotion) {
            gsap.fromTo(
              targets,
              { autoAlpha: 0, y: 12 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.6,
                stagger: 0.06,
                ease: "power3.out",
                willChange: "transform, opacity",
                clearProps: "transform,opacity,visibility,willChange",
              }
            )
          }

          shellRef.current?.classList.remove("shell-transition-pending")
          setIsInitialPageLoad(false)
        }
      )

      return () => media.revert()
    },
    { scope: shellRef }
  )

  return (
    <InitialPageLoadProvider value={isInitialPageLoad}>
      <div
        ref={shellRef}
        className="shell-transition-pending flex min-h-svh max-w-md min-w-0 flex-col p-6 pb-24 md:mx-auto md:pb-6"
      >
        <Header />
        <main className="w-full min-w-0 flex-1 text-left wrap-break-word md:mt-16 md:w-xl md:max-w-[calc(100vw-3rem)] md:self-center">
          {children}
        </main>
        <Footer />
      </div>
    </InitialPageLoadProvider>
  )
}
