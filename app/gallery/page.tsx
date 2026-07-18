import { readdir } from "node:fs/promises"
import { join } from "node:path"
import type { Metadata } from "next"
import Image from "next/image"

import { listGalleryMedia } from "@/lib/gallery/db"
import { cn } from "@/lib/utils"

const galleryDirectory = join(process.cwd(), "public", "images", "gallery")
const supportedImagePattern = /\.(?:avif|gif|jpe?g|png|webp)$/i
const supportedVideoPattern = /\.(?:m4v|mov|mp4|ogv|webm)$/i

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "A visual collection of moments from Tomiwa David's life and work.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    type: "website",
    url: "/gallery",
    title: "Gallery | daaysorn",
    description:
      "A visual collection of moments from Tomiwa David's life and work.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gallery | daaysorn",
    description:
      "A visual collection of moments from Tomiwa David's life and work.",
    creator: "@daaysorn",
  },
}

async function getGalleryMedia() {
  try {
    const entries = await readdir(galleryDirectory, { withFileTypes: true })

    return entries
      .filter((entry) => {
        if (!entry.isFile()) return false

        return (
          supportedImagePattern.test(entry.name) ||
          supportedVideoPattern.test(entry.name)
        )
      })
      .map((entry) => ({
        id: `local:${entry.name}`,
        filename: entry.name,
        type: supportedVideoPattern.test(entry.name) ? "video" : "image",
        src: `/images/gallery/${encodeURIComponent(entry.name)}`,
        poster: null,
        label: mediaLabel(entry.name),
        remote: false,
      }))
      .sort((a, b) =>
        a.filename.localeCompare(b.filename, undefined, { numeric: true })
      )
  } catch {
    return []
  }
}

function mediaLabel(filename: string) {
  const label = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()

  return label || "Gallery media"
}

export default async function GalleryPage() {
  const [remoteMedia, localMedia] = await Promise.all([
    listGalleryMedia(),
    getGalleryMedia(),
  ])
  const media = [
    ...remoteMedia.flatMap((item) => {
      const src =
        item.type === "video"
          ? item.mediaUrl
          : (item.mediumUrl ?? item.largeUrl ?? item.smallUrl)
      if (!src) return []

      return [
        {
          id: item.id,
          filename: item.id,
          type: item.type,
          src,
          poster: item.posterUrl,
          label: item.altText,
          remote: true,
        },
      ]
    }),
    ...localMedia,
  ]

  return (
    <article className="min-w-0 pb-8 md:pb-24">
      <h1 className="text-3xl leading-none font-bold tracking-tight xs:text-4xl md:text-3xl">
        Gallery
      </h1>

      {media.length === 0 ? (
        <p className="mt-8 text-base text-muted-foreground md:mt-7 md:text-lg">
          Nothing yet
        </p>
      ) : (
        <div className="mt-8 grid auto-rows-[11rem] grid-cols-2 gap-3 md:mt-7 md:auto-rows-[13rem] md:grid-cols-3 md:gap-4">
          {media.map((item, index) => (
            <figure
              key={item.id}
              className={cn(
                "relative min-w-0 overflow-hidden rounded-xl bg-muted",
                index % 7 === 0 && "col-span-2 row-span-2",
                index % 7 === 3 && "row-span-2",
                index % 7 === 5 && "md:col-span-2"
              )}
            >
              {item.type === "video" ? (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  src={item.src}
                  poster={item.poster ?? undefined}
                  aria-label={item.label}
                  className="size-full object-cover"
                />
              ) : (
                <Image
                  fill
                  unoptimized={item.remote}
                  src={item.src}
                  alt={item.label}
                  sizes="(min-width: 768px) 384px, (min-width: 360px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 ease-out motion-safe:hover:scale-[1.025]"
                />
              )}
            </figure>
          ))}
        </div>
      )}
    </article>
  )
}
