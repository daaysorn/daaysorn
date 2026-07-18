export type GalleryPostInstructions = {
  destinations: { gallery: boolean; instagram: boolean }
  caption: string
}

const destinationCommandPattern = /\/(?:instagal|insta)(?:@\w+)?\b/gi
const instagramCaptionPattern =
  /\/intatag(?:@\w+)?\b(?:\s+(?:"([^"]*)"|'([^']*)'|([^\n]*)))?/i

export function parseGalleryPostInstructions(
  rawText: string
): GalleryPostInstructions {
  const hasInstagramAndGallery = /\/instagal(?:@\w+)?\b/i.test(rawText)
  const hasInstagramOnly = /\/insta(?:@\w+)?\b/i.test(rawText)
  const instagramCaptionMatch = rawText.match(instagramCaptionPattern)
  const instagramCaption = instagramCaptionMatch
    ? (
        instagramCaptionMatch[1] ??
        instagramCaptionMatch[2] ??
        instagramCaptionMatch[3] ??
        ""
      ).trim()
    : null

  const caption = rawText
    .replace(instagramCaptionPattern, " ")
    .replace(destinationCommandPattern, " ")
    .replace(/\s+/g, " ")
    .trim()

  return {
    destinations: {
      gallery:
        hasInstagramAndGallery || (!hasInstagramOnly && !instagramCaptionMatch),
      instagram:
        hasInstagramAndGallery ||
        hasInstagramOnly ||
        Boolean(instagramCaptionMatch),
    },
    caption: instagramCaption ?? caption,
  }
}

export const telegramBotHelp = `daaysorn posting commands

KEEPS
/keep <link> → Add a link to Keeps
/keep <link> #design #tools → Add a Keep with custom tags
/delete <link> → Delete a Keep
You can also send up to 5 links without /keep.

GALLERY & INSTAGRAM
Send a photo or video normally → Gallery only
/insta + media → Instagram only
/instagal + media → Gallery and Instagram
/intatag "life update" + album → Instagram carousel captioned “life update”
/instagal /intatag "life update" + album → Gallery and Instagram carousel

For a carousel, select 2–10 photos and send them as one Telegram album. Instagram carousels cannot mix photos and videos.

/delete + reply → Delete the replied-to Gallery photo or video
/help → Show this complete guide
/start → Show this complete guide`
