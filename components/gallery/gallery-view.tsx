"use client"

import Image from "next/image"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { PiCaretLeftBold, PiCaretRightBold, PiXBold } from "react-icons/pi"

import { Button } from "@/components/ui/button"
import { trackAnalyticsEvent } from "@/lib/analytics"

export type GalleryViewItem = {
  id: string
  type: "image" | "video"
  src: string
  previewSrc: string
  poster: string | null
  label: string
  remote: boolean
  width: number | null
  height: number | null
}

function subscribeToDesktopLayout(callback: () => void) {
  const query = window.matchMedia("(min-width: 48rem)")
  query.addEventListener("change", callback)
  return () => query.removeEventListener("change", callback)
}

function useDesktopLayout() {
  return useSyncExternalStore(
    subscribeToDesktopLayout,
    () => window.matchMedia("(min-width: 48rem)").matches,
    () => false
  )
}

function arrangeIntoColumns(media: GalleryViewItem[], columnCount: number) {
  const columns = Array.from(
    { length: columnCount },
    () => [] as Array<{ index: number; item: GalleryViewItem }>
  )
  const columnHeights = Array.from({ length: columnCount }, () => 0)

  media.forEach((item, index) => {
    const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights))
    columns[shortestColumn].push({ index, item })
    columnHeights[shortestColumn] +=
      item.width && item.height ? item.height / item.width : 1.25
  })

  return columns
}

function GalleryVideoPreview({ item }: { item: GalleryViewItem }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && video.currentTime < 5) {
          void video.play().catch(() => undefined)
        } else {
          video.pause()
        }
      },
      { threshold: 0.35 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={videoRef}
      muted
      loop
      playsInline
      preload="metadata"
      src={item.src}
      poster={item.poster ?? undefined}
      aria-hidden="true"
      onTimeUpdate={(event) => {
        if (event.currentTarget.currentTime >= 5) {
          event.currentTarget.currentTime = 0
        }
      }}
      className="size-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.025]"
    />
  )
}

export function GalleryView({ media }: { media: GalleryViewItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const isDesktop = useDesktopLayout()
  const activeItem = activeIndex === null ? null : media[activeIndex]
  const columns = useMemo(
    () => arrangeIntoColumns(media, isDesktop ? 3 : 2),
    [isDesktop, media]
  )

  const showPrevious = useCallback(() => {
    trackAnalyticsEvent("gallery", "gallery_navigate", {
      direction: "previous",
    })
    setActiveIndex((current) =>
      current === null ? null : (current - 1 + media.length) % media.length
    )
  }, [media.length])

  const showNext = useCallback(() => {
    trackAnalyticsEvent("gallery", "gallery_navigate", {
      direction: "next",
    })
    setActiveIndex((current) =>
      current === null ? null : (current + 1) % media.length
    )
  }, [media.length])

  useEffect(() => {
    if (activeIndex === null) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") showPrevious()
      if (event.key === "ArrowRight") showNext()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeIndex, showNext, showPrevious])

  return (
    <>
      <div className="mt-8 grid grid-cols-2 items-start gap-3 md:mt-7 md:grid-cols-3 md:gap-4">
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="grid min-w-0 gap-3 md:gap-4">
            {column.map(({ index, item }) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Preview ${item.label}`}
                onClick={() => {
                  trackAnalyticsEvent("gallery", "gallery_media_open", {
                    media_type: item.type,
                    media_source: item.remote ? "remote" : "local",
                  })
                  setActiveIndex(index)
                }}
                className="group relative block w-full cursor-pointer overflow-hidden rounded-xl bg-muted text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  aspectRatio:
                    item.width && item.height
                      ? `${item.width} / ${item.height}`
                      : "4 / 5",
                }}
              >
                {item.type === "video" ? (
                  <GalleryVideoPreview item={item} />
                ) : (
                  <Image
                    fill
                    unoptimized={item.remote}
                    src={item.src}
                    alt=""
                    sizes="(min-width: 768px) 192px, 50vw"
                    className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.025]"
                  />
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      <DialogPrimitive.Root
        open={activeIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            trackAnalyticsEvent("gallery", "gallery_media_close")
            setActiveIndex(null)
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-background/92 backdrop-blur-2xl data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed inset-0 z-[60] flex items-center justify-center p-3 outline-none xs:p-5 md:p-8">
            <DialogPrimitive.Title className="sr-only">
              Gallery preview
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Use the previous and next buttons or your arrow keys to browse.
            </DialogPrimitive.Description>

            {activeItem ? (
              <div className="relative flex size-full min-w-0 items-center justify-center">
                {activeItem.type === "video" ? (
                  <video
                    key={activeItem.id}
                    controls
                    playsInline
                    preload="metadata"
                    src={activeItem.previewSrc}
                    poster={activeItem.poster ?? undefined}
                    aria-label={activeItem.label}
                    onPlay={() =>
                      trackAnalyticsEvent("gallery", "gallery_video_play", {
                        media_source: activeItem.remote ? "remote" : "local",
                      })
                    }
                    className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
                  />
                ) : (
                  <div
                    key={activeItem.id}
                    className="relative size-full min-w-0"
                  >
                    <Image
                      fill
                      preload
                      unoptimized={activeItem.remote}
                      src={activeItem.previewSrc}
                      alt={activeItem.label}
                      sizes="100vw"
                      className="object-contain"
                    />
                  </div>
                )}

                <DialogPrimitive.Close asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Close preview"
                    className="absolute top-0 right-0 rounded-full bg-popover/80 shadow-lg backdrop-blur-xl"
                  >
                    <PiXBold />
                  </Button>
                </DialogPrimitive.Close>

                {media.length > 1 ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      aria-label="Previous media"
                      onClick={showPrevious}
                      className="absolute top-1/2 left-0 -translate-y-1/2 rounded-full bg-popover/80 shadow-lg backdrop-blur-xl"
                    >
                      <PiCaretLeftBold />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      aria-label="Next media"
                      onClick={showNext}
                      className="absolute top-1/2 right-0 -translate-y-1/2 rounded-full bg-popover/80 shadow-lg backdrop-blur-xl"
                    >
                      <PiCaretRightBold />
                    </Button>
                  </>
                ) : null}

                <p className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-popover/80 px-3 py-1 font-mono text-xs text-muted-foreground shadow-lg backdrop-blur-xl">
                  {(activeIndex ?? 0) + 1} / {media.length}
                </p>
              </div>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
