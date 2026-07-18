import type { GalleryMediaDraft } from "@/lib/gallery/types"

const BUFFER_API_URL = "https://api.buffer.com"

type BufferResponse = {
  data?: {
    createPost?:
      | { post?: { id?: string }; message?: never }
      | { post?: never; message?: string }
  }
  errors?: Array<{ message?: string }>
}

export async function publishGalleryMediaToInstagram(
  media: GalleryMediaDraft | GalleryMediaDraft[],
  caption?: string
) {
  const apiKey = process.env.BUFFER_API_KEY?.trim()
  const channelId = process.env.BUFFER_INSTAGRAM_CHANNEL_ID?.trim()
  if (!apiKey || !channelId) return "unconfigured" as const

  const items = Array.isArray(media) ? media : [media]
  if (!items.length) throw new Error("Instagram post has no media")
  if (items.length > 10) {
    throw new Error("Instagram carousels can contain at most 10 images")
  }
  if (items.length > 1 && items.some((item) => item.type !== "image")) {
    throw new Error("Instagram carousels can only contain images")
  }

  const assets = items.map((item) => {
    const assetUrl =
      item.type === "video"
        ? item.mediaUrl
        : (item.largeUrl ?? item.mediumUrl ?? item.smallUrl)
    if (!assetUrl) {
      throw new Error("Gallery media has no public Buffer asset URL")
    }

    return item.type === "video"
      ? { video: { url: assetUrl, metadata: { thumbnailOffset: 2000 } } }
      : { image: { url: assetUrl } }
  })

  const response = await fetch(BUFFER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        mutation PublishGalleryMedia($input: CreatePostInput!) {
          createPost(input: $input) {
            ... on PostActionSuccess { post { id } }
            ... on MutationError { message }
          }
        }
      `,
      variables: {
        input: {
          text: (caption ?? items[0].caption) || undefined,
          channelId,
          schedulingType: "automatic",
          mode: "shareNow",
          assets,
          metadata: {
            instagram: {
              type: items[0].type === "video" ? "reel" : "post",
              shouldShareToFeed: true,
            },
          },
          source: "daaysorn-gallery",
        },
      },
    }),
    cache: "no-store",
  })

  const result = (await response.json()) as BufferResponse
  const error =
    result.errors?.[0]?.message ?? result.data?.createPost?.message ?? null
  if (!response.ok || error || !result.data?.createPost?.post?.id) {
    throw new Error(error || `Buffer returned ${response.status}`)
  }

  return {
    status: "published",
    postId: result.data.createPost.post.id,
  } as const
}
