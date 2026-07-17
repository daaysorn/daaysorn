import type { Metadata } from "next"
import { Geist, JetBrains_Mono, Montserrat } from "next/font/google"

import "./globals.css"
import { AppShell } from "@/components/app-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Daaysorn"

export const metadata: Metadata = {
  title: appName,
}

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
      data-scroll-behavior="smooth"
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
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
