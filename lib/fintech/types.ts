export const fintechCategories = [
  "security",
  "data-protection",
  "fraud",
  "compliance",
  "payments",
  "reliability",
  "ux-trust",
] as const

export type FintechCategory = (typeof fintechCategories)[number]

export const fintechCategoryDetails: Record<
  FintechCategory,
  { title: string; focus: string }
> = {
  security: {
    title: "Security",
    focus:
      "authentication, authorization, secrets management, encryption at rest and in transit, API security, session handling, and secure infrastructure for financial applications",
  },
  "data-protection": {
    title: "Data Protection",
    focus:
      "PII and financial data handling, data minimization, retention and deletion, GDPR and NDPR compliance, tokenization, and access controls around customer data",
  },
  fraud: {
    title: "Fraud Prevention",
    focus:
      "transaction monitoring, velocity checks, device fingerprinting, account takeover prevention, chargeback handling, and anomaly detection in financial products",
  },
  compliance: {
    title: "Compliance, KYC & AML",
    focus:
      "know-your-customer onboarding, anti-money-laundering screening, sanctions checks, audit trails, regulatory licensing, and record keeping",
  },
  payments: {
    title: "Payments Infrastructure",
    focus:
      "idempotency, double-entry ledgers, reconciliation, webhook reliability, retries, settlement, currency handling, and integrating payment processors",
  },
  reliability: {
    title: "Reliability & Operations",
    focus:
      "uptime expectations for money movement, graceful degradation, incident response, observability, and testing strategies for financial systems",
  },
  "ux-trust": {
    title: "UX & Customer Trust",
    focus:
      "communicating money states honestly, error messaging, transaction transparency, dispute flows, and building user trust in financial products",
  },
}

export type FintechTweet = {
  id: string
  authorHandle: string
  authorName: string
  text: string
  url: string
  createdAt: string
  likeCount: number
  retweetCount: number
  replyCount: number
  viewCount: number
  isReply: boolean
}

export type TweetClassification = {
  id: string
  relevant: boolean
  category: FintechCategory | "other"
  claim: string
  confidence: "high" | "medium" | "low"
}

export type ClassifiedTweet = FintechTweet & {
  category: FintechCategory
  claim: string
  confidence: "high" | "medium" | "low"
}

export type FintechDoc = {
  url: string
  title: string
  source: string
  content: string
  category: FintechCategory
  relevanceScore: number
}
