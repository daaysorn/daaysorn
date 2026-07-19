export type RantStatus = "draft" | "published"

export type Rant = {
  id: string
  telegramMessageId: number
  status: RantStatus
  title: string
  slug: string
  excerpt: string
  seoDescription: string
  bodyHtml: string
  bodyText: string
  tags: string[]
  readingMinutes: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type RantDraft = Omit<
  Rant,
  "id" | "status" | "publishedAt" | "createdAt" | "updatedAt"
>

export type Perspective = {
  id: string
  rantId: string
  parentId: string | null
  parentName: string | null
  name: string
  body: string
  createdAt: string
}

export type TelegramTextEntity = {
  type: string
  offset: number
  length: number
  url?: string
  language?: string
}
