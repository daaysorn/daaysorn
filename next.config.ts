import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: process.env.R2_PUBLIC_BASE_URL
      ? [
          {
            protocol: "https",
            hostname: new URL(process.env.R2_PUBLIC_BASE_URL).hostname,
            pathname: "/gallery/**",
          },
        ]
      : [],
  },
  async headers() {
    return [
      ...["/keeps", "/gallery", "/rants", "/rants/:path*"].map((source) => ({
        source,
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      })),
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ]
  },
}

export default nextConfig
