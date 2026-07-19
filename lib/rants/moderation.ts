import { Cencori } from "cencori"

type ModerationDecision = {
  decision: "auto_approve" | "review"
  reason: string
}

export async function moderatePerspectiveContent(input: {
  rantTitle: string
  body: string
  kind: "perspective" | "reply" | "edit"
}): Promise<ModerationDecision> {
  const apiKey = process.env.CENCORI_API_KEY?.trim()
  if (!apiKey) {
    return { decision: "review", reason: "AI moderation is unavailable." }
  }

  try {
    const cencori = new Cencori({ apiKey })
    const response = await cencori.ai.generateObject<ModerationDecision>({
      model:
        process.env.CENCORI_RANTS_MODERATION_MODEL?.trim() ||
        process.env.CENCORI_RANTS_MODEL?.trim() ||
        "gpt-4.1-nano",
      schemaName: "rant_perspective_moderation",
      schemaDescription:
        "A conservative moderation decision for a public discussion contribution.",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          decision: {
            type: "string",
            enum: ["auto_approve", "review"],
          },
          reason: { type: "string", minLength: 3, maxLength: 160 },
        },
        required: ["decision", "reason"],
      },
      maxTokens: 120,
      messages: [
        {
          role: "system",
          content:
            "Moderate a contribution for a public personal blog. Auto-approve harmless, civil, relevant reactions and replies, including very short responses such as 'hmm'. Require human review for threats, hate, harassment, sexual content, personal data, illegal instructions, spam, scams, impersonation, targeted allegations, or anything ambiguous. Do not rewrite the content. When uncertain, choose review.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
    })

    return response.object
  } catch {
    return { decision: "review", reason: "AI moderation could not decide." }
  }
}
