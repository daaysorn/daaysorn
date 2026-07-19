export type ValyuResult = {
  title: string
  url: string
  content: string
  source: string
  relevance_score: number
}

type ValyuResponse = {
  success?: boolean
  error?: string | null
  results?: ValyuResult[]
}

export async function valyuSearch(
  query: string,
  { maxResults = 8, relevanceThreshold = 0.6 } = {}
): Promise<ValyuResult[]> {
  const apiKey = process.env.VALYU_API_KEY?.trim()
  if (!apiKey) throw new Error("VALYU_API_KEY is not configured")

  const baseUrl =
    process.env.VALYU_API_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://api.valyu.ai"

  const response = await fetch(`${baseUrl}/v1/search`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      search_type: "web",
      max_num_results: maxResults,
      relevance_threshold: relevanceThreshold,
      response_length: "large",
      is_tool_call: false,
    }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) {
    throw new Error(`Valyu search returned ${response.status}`)
  }

  const payload = (await response.json()) as ValyuResponse
  if (payload.success === false) {
    throw new Error(`Valyu search failed: ${payload.error ?? "unknown"}`)
  }

  return (payload.results ?? []).filter(
    (result) => result.url && result.content?.trim()
  )
}
