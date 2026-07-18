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

export const telegramBotHelp = `daaysorn posting commands

KEEPS
/keep <link> → Add a link to Keeps
/keep <link> #design #tools → Add a Keep with custom tags
/deletekeep <link> → Delete a Keep
You can also send up to 5 links without /keep.

GALLERY & INSTAGRAM
Send a photo or video normally → Gallery only
/gallery + media → Gallery only
/insta + media → Instagram only
/instagal + media → Gallery and Instagram
/intatag "life update" + album → Instagram carousel captioned “life update”
/instagal_tag "life update" + album → Gallery and Instagram carousel (typing /instagal-tag also works)

For a carousel, select 2–10 photos and send them as one Telegram album. Instagram carousels cannot mix photos and videos.

/deletegallery + reply → Delete the replied-to Gallery photo or video
/delete → Shortcut: delete a Keep by link or Gallery media by reply
/help → Show this complete guide
/start → Show this complete guide`
