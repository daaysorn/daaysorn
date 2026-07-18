export {}

const apiKey = process.env.BUFFER_API_KEY?.trim()
if (!apiKey) throw new Error("BUFFER_API_KEY is missing")

async function queryBuffer<T>(query: string, variables?: object) {
  const response = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  })
  const result = (await response.json()) as {
    data?: T
    errors?: Array<{ message?: string }>
  }
  if (!response.ok || result.errors?.length || !result.data) {
    throw new Error(
      result.errors?.map((error) => error.message).join(", ") ||
        `Buffer returned ${response.status}`
    )
  }
  return result.data
}

const { account } = await queryBuffer<{
  account: { organizations: Array<{ id: string; name: string }> }
}>(`
  query GetOrganizations {
    account { organizations { id name } }
  }
`)

for (const organization of account.organizations) {
  const { channels } = await queryBuffer<{
    channels: Array<{
      id: string
      displayName: string
      service: string
    }>
  }>(
    `
      query GetChannels($organizationId: OrganizationId!) {
        channels(input: { organizationId: $organizationId }) {
          id
          displayName
          service
        }
      }
    `,
    { organizationId: organization.id }
  )

  console.log(`\n${organization.name}`)
  console.table(channels)
}
