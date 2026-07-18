import type { Metadata, Viewport } from "next"
import { GoogleAnalytics } from "@next/third-parties/google"
import { Geist, JetBrains_Mono, Montserrat } from "next/font/google"

import "./globals.css"
import { AppShell } from "@/components/app-shell"
import { PWARegister } from "@/components/pwa-register"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { siteConfig } from "@/lib/seo"

const googleAnalyticsId =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim() || "G-MXTGTBLTY4"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.creator.name, url: siteConfig.url }],
  creator: siteConfig.creator.name,
  publisher: siteConfig.creator.name,
  keywords: [...siteConfig.keywords],
  category: "technology",
  alternates: {
    canonical: "/",
    types: {
      "text/markdown": [
        { url: "/llms.txt", title: "daaysorn AI overview" },
        { url: "/llms-full.txt", title: "daaysorn full AI context" },
      ],
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    locale: siteConfig.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    creator: siteConfig.creator.handle,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteConfig.name,
  },
  formatDetection: {
    telephone: false,
  },
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
          <PWARegister />
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
      <GoogleAnalytics gaId={googleAnalyticsId} />
    </html>
  )
}
