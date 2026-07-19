import { readdir } from "node:fs/promises"
import { join } from "node:path"
import sharp from "sharp"

import {
  GalleryView as GalleryMediaView,
  type GalleryViewItem,
} from "@/components/gallery/gallery-view"
import { listGalleryMedia, listGalleryMediaFresh } from "@/lib/gallery/db"

const galleryDirectory = join(process.cwd(), "public", "images", "gallery")
const supportedImagePattern = /\.(?:avif|gif|jpe?g|png|webp)$/i
const supportedVideoPattern = /\.(?:m4v|mov|mp4|ogv|webm)$/i

function mediaLabel(filename: string) {
  return (
    filename
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim() || "Gallery media"
  )
}

async function getLocalGalleryMedia() {
  try {
    const entries = await readdir(galleryDirectory, { withFileTypes: true })
    return Promise.all(
      entries
        .filter(
          (entry) =>
            entry.isFile() &&
            (supportedImagePattern.test(entry.name) ||
              supportedVideoPattern.test(entry.name))
        )
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true })
        )
        .map(async (entry): Promise<GalleryViewItem> => {
          const type: GalleryViewItem["type"] = supportedVideoPattern.test(
            entry.name
          )
            ? "video"
            : "image"
          let width: number | null = null
          let height: number | null = null
          if (type === "image") {
            const metadata = await sharp(
              join(galleryDirectory, entry.name)
            ).metadata()
            width = metadata.width ?? null
            height = metadata.height ?? null
          }
          const src = `/images/gallery/${encodeURIComponent(entry.name)}`
          return {
            id: `local:${entry.name}`,
            type,
            src,
            previewSrc: src,
            poster: null,
            label: mediaLabel(entry.name),
            remote: false,
            width,
            height,
          }
        })
    )
  } catch {
    return []
  }
}

export default async function GalleryView() {
  const [remoteMedia, localMedia] = await Promise.all([
    process.env.NODE_ENV === "development"
      ? listGalleryMediaFresh()
      : listGalleryMedia(),
    getLocalGalleryMedia(),
  ])
  const media: GalleryViewItem[] = [
    ...remoteMedia.flatMap((item) => {
      const src =
        item.type === "video"
          ? item.mediaUrl
          : (item.mediumUrl ?? item.largeUrl ?? item.smallUrl)
      if (!src) return []
      return [
        {
          id: item.id,
          type: item.type,
          src,
          previewSrc: item.type === "image" ? (item.largeUrl ?? src) : src,
          poster: item.posterUrl,
          label: item.altText,
          remote: true,
          width: item.width,
          height: item.height,
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
      <p className="mt-3 text-sm text-muted-foreground xs:text-base md:mt-2">
        Moments from my life, work, and everything in between.
      </p>
      {media.length === 0 ? (
        <p className="mt-8 text-base text-muted-foreground md:mt-7 md:text-lg">
          Nothing yet
        </p>
      ) : (
        <GalleryMediaView media={media} />
      )}
    </article>
  )
}
