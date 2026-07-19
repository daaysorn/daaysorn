import type { ReactNode } from "react"

import { Footer, Header } from "@/components/nav"

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell-transition-pending flex min-h-svh max-w-md min-w-0 flex-col p-6 pb-24 md:mx-auto md:pb-6">
      <Header />
      <main className="w-full min-w-0 flex-1 text-left wrap-break-word md:mt-16 md:w-xl md:max-w-[calc(100vw-3rem)] md:self-center">
        {children}
      </main>
      <Footer />
    </div>
  )
}
