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

export async function publishGalleryMediaToInstagram(media: GalleryMediaDraft) {
  const apiKey = process.env.BUFFER_API_KEY?.trim()
  const channelId = process.env.BUFFER_INSTAGRAM_CHANNEL_ID?.trim()
  if (!apiKey || !channelId) return "unconfigured" as const

  const assetUrl =
    media.type === "video"
      ? media.mediaUrl
      : (media.largeUrl ?? media.mediumUrl ?? media.smallUrl)
  if (!assetUrl) throw new Error("Gallery media has no public Buffer asset URL")

  const asset =
    media.type === "video"
      ? { video: { url: assetUrl, metadata: { thumbnailOffset: 2000 } } }
      : { image: { url: assetUrl } }

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
          text: media.caption || undefined,
          channelId,
          schedulingType: "automatic",
          mode: "shareNow",
          assets: [asset],
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
