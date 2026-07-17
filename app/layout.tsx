import { Geist, JetBrains_Mono, Montserrat } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
import { Header, Footer } from "@/components/nav"

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
        "antialiased font-sans bg-background text-foreground scroll-smooth",
        geistSans.variable,
        montserratHeading.variable,
        jetbrainsMono.variable,
      )}
    >
      <body>
        <ThemeProvider>
        <div className="flex min-h-svh p-6 max-w-md min-w-0 flex-col">
          <Header />
          {children}
          <Footer />
          </div>
          </ThemeProvider>
      </body>
    </html>
  )
}
