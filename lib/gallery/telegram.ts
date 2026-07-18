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

Send a photo or video normally → Gallery only
/insta → Instagram only
/instagal → Gallery and Instagram
/intatag "life update" → Instagram carousel with the caption “life update”
/instagal /intatag "life update" → Gallery and Instagram carousel

For a carousel, select 2–10 photos and send them as one Telegram album. Instagram carousels cannot mix photos and videos.

/delete → Reply to a Gallery photo/video to delete it, or add a Keeps link
/help → Show these instructions

Links without media are added to Keeps. Add #tags to organize a Keep.`
