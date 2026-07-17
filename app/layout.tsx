import { Geist, JetBrains_Mono, Montserrat } from "next/font/google"

import "./globals.css"
import { Footer, Header } from "@/components/nav"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const montserratHeading = Montserrat({
  subsets: ["latin"],
  variable: "--font-heading",
})

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "scroll-smooth bg-background font-sans text-foreground antialiased",
        geistSans.variable,
        montserratHeading.variable,
        jetbrainsMono.variable
      )}
    >
      <body>
        <ThemeProvider>
          <div className="flex min-h-svh max-w-md min-w-0 flex-col p-6 pb-24 md:mx-auto md:pb-6">
            <Header />
            <main className="w-full min-w-0 flex-1 text-left wrap-break-word md:mt-16 md:w-xl md:max-w-[calc(100vw-3rem)] md:self-center">
              {children}
            </main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
