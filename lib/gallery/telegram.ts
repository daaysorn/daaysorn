export type GalleryPostInstructions = {
  destinations: { gallery: boolean; instagram: boolean }
  caption: string
}

const destinationCommandPattern =
  /\/(?:instagal(?:-|_)tag|instagal|insta|gallery)(?:@\w+)?\b/gi
const instagramAndGalleryCaptionPattern =
  /\/instagal(?:-|_)tag(?:@\w+)?\b(?:\s+(?:"([^"]*)"|'([^']*)'|([^\n]*)))?/i
const instagramCaptionPattern =
  /\/intatag(?:@\w+)?\b(?:\s+(?:"([^"]*)"|'([^']*)'|([^\n]*)))?/i

export function parseGalleryPostInstructions(
  rawText: string
): GalleryPostInstructions {
  const hasInstagramAndGallery = /\/instagal(?:@\w+)?\b/i.test(rawText)
  const hasInstagramOnly = /\/insta(?:@\w+)?\b/i.test(rawText)
  const hasGalleryOnly = /\/gallery(?:@\w+)?\b/i.test(rawText)
  const instagramAndGalleryCaptionMatch = rawText.match(
    instagramAndGalleryCaptionPattern
  )
  const instagramCaptionMatch =
    instagramAndGalleryCaptionMatch ?? rawText.match(instagramCaptionPattern)
  const instagramCaption = instagramCaptionMatch
    ? (
        instagramCaptionMatch[1] ??
        instagramCaptionMatch[2] ??
        instagramCaptionMatch[3] ??
        ""
      ).trim()
    : null

  const caption = rawText
    .replace(instagramAndGalleryCaptionPattern, " ")
    .replace(instagramCaptionPattern, " ")
    .replace(destinationCommandPattern, " ")
    .replace(/\s+/g, " ")
    .trim()

  return {
    destinations: {
      gallery:
        hasGalleryOnly ||
        Boolean(instagramAndGalleryCaptionMatch) ||
        hasInstagramAndGallery ||
        (!hasInstagramOnly && !instagramCaptionMatch),
      instagram:
        hasInstagramAndGallery ||
        hasInstagramOnly ||
        Boolean(instagramAndGalleryCaptionMatch) ||
        Boolean(instagramCaptionMatch),
    },
    caption: instagramCaption ?? caption,
  }
}

export const telegramBotHelp = `<b>daaysorn bot</b>
Choose what you want to do.

<b>📌 Keeps</b>
/keep <code>&lt;link&gt;</code>  Save a link
Add <code>#tags</code> if needed. You can send up to five links.
/deletekeep <code>&lt;link&gt;</code>  Delete a Keep

<b>🖼 Gallery</b>
Send media normally, or use /gallery.
/deletegallery  Reply to media to delete it

<b>📸 Instagram</b>
/insta  Instagram only
/instagal  Gallery + Instagram

<b>Carousel</b> <i>(2–10 photos)</i>
/intatag <code>"life update"</code>  Instagram only
/instagal_tag <code>"life update"</code>  Gallery + Instagram
Videos cannot be included in a carousel.

<b>✍️ Rants</b>
/rant <code>&lt;text&gt;</code>  Create or update a draft
/publish  Reply to a draft to publish
/deleterant  Reply to a Rant to delete

<b>💬 Perspectives</b>
/approve <code>&lt;id&gt;</code>  Approve a submission
/reject <code>&lt;id&gt;</code>  Reject a submission

<b>More</b>
/delete  Keeps/Gallery delete shortcut
/help  Show this guide
/start  Start here`
