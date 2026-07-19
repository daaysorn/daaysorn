import type { Metadata } from "next"

import { FintechSkillView } from "@/views"

export const metadata: Metadata = {
  title: "Fintech Best Practices Skill",
  description:
    "An installable skill for AI agents building fintech applications — security, data protection, fraud prevention, compliance, payments, and user trust, with cited sources.",
  alternates: { canonical: "/skill/fintech-best-practices" },
  openGraph: {
    type: "website",
    url: "/skill/fintech-best-practices",
    title: "Fintech Best Practices Skill | daaysorn",
    description:
      "An installable skill for AI agents building fintech applications — security, data protection, fraud prevention, compliance, payments, and user trust, with cited sources.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fintech Best Practices Skill | daaysorn",
    description:
      "An installable skill for AI agents building fintech applications — security, data protection, fraud prevention, compliance, payments, and user trust, with cited sources.",
    creator: "@daaysorn",
  },
}

export default function FintechSkillPage() {
  return <FintechSkillView />
}
