function formText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const payload = {
    title: formText(formData, "title", 300),
    text: formText(formData, "text", 4_000),
    url: formText(formData, "url", 2_000),
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const destination = new URL(`/keeps#share-target=${encoded}`, request.url)

  return Response.redirect(destination, 303)
}
