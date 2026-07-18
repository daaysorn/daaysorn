export type Keep = {
  id: string
  href: string
  source: string
  author: string
  title: string
  summary: string
  imageUrl: string | null
  tags: string[]
  savedAt: string
}

export type KeepDraft = Omit<Keep, "id" | "savedAt"> & {
  telegramMessageId: number
  rawText: string
}
