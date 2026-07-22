import sharp from "sharp"

function roundedMask(width: number, height: number, radius: number) {
  return Buffer.from(
    `<svg width="${width}" height="${height}"><rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#000"/></svg>`
  )
}

function strokeOverlay(width: number, height: number, radius: number) {
  return Buffer.from(
    `<svg width="${width}" height="${height}"><rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${radius}" ry="${radius}" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="2"/></svg>`
  )
}

async function makeWide(variant: "a" | "b") {
  const out = `public/screenshots/playstore-wide-${variant}.png`
  const base = sharp("public/screenshots/home-wide.png")
  const bg = sharp({
    create: {
      width: 1280,
      height: 720,
      channels: 4,
      background: variant === "a" ? "#0b0b0f" : "#000000",
    },
  })

  const shotW = 1040
  const shotH = 585
  const shot = await base
    .resize(shotW, shotH, { fit: "cover" })
    .composite([{ input: roundedMask(shotW, shotH, 28), blend: "dest-in" }])
    .png()
    .toBuffer()

  const shadow = await sharp({
    create: {
      width: shotW + 40,
      height: shotH + 40,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${shotW + 40}" height="${shotH + 40}"><rect x="20" y="20" width="${shotW}" height="${shotH}" rx="28" ry="28" fill="rgba(0,0,0,0.55)"/></svg>`
        ),
      },
    ])
    .blur(18)
    .png()
    .toBuffer()

  const topLabel =
    variant === "a"
      ? Buffer.from(
          `<svg width="1280" height="140">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b1b26"/>
      <stop offset="1" stop-color="#0b0b0f"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="140" fill="url(#g)"/>
  <text x="64" y="78" font-size="34" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, Roboto">daaysorn</text>
  <text x="64" y="112" font-size="18" fill="rgba(255,255,255,0.72)" font-family="system-ui, -apple-system, Segoe UI, Roboto">Keeps · Gallery · Rants</text>
</svg>`
        )
      : Buffer.from(
          `<svg width="1280" height="140">
  <rect width="1280" height="140" fill="#000000"/>
  <text x="64" y="88" font-size="30" fill="rgba(255,255,255,0.9)" font-family="system-ui, -apple-system, Segoe UI, Roboto">daaysorn</text>
</svg>`
        )

  await bg
    .composite([
      { input: topLabel, top: 0, left: 0 },
      { input: shadow, top: 160, left: 100 },
      { input: shot, top: 180, left: 120 },
      { input: strokeOverlay(shotW, shotH, 28), top: 180, left: 120 },
    ])
    .png()
    .toFile(out)
}

async function makeNarrow(variant: "a" | "b") {
  const out = `public/screenshots/playstore-narrow-${variant}.png`
  const base = sharp("public/screenshots/home-narrow.png")
  const bg = sharp({
    create: {
      width: 390,
      height: 844,
      channels: 4,
      background: variant === "a" ? "#0b0b0f" : "#000000",
    },
  })

  const shotW = 342
  const shotH = 740
  const shot = await base
    .resize(shotW, shotH, { fit: "cover" })
    .composite([{ input: roundedMask(shotW, shotH, 32), blend: "dest-in" }])
    .png()
    .toBuffer()

  const shadow = await sharp({
    create: {
      width: shotW + 30,
      height: shotH + 30,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${shotW + 30}" height="${shotH + 30}"><rect x="15" y="15" width="${shotW}" height="${shotH}" rx="32" ry="32" fill="rgba(0,0,0,0.55)"/></svg>`
        ),
      },
    ])
    .blur(16)
    .png()
    .toBuffer()

  const topLabel =
    variant === "a"
      ? Buffer.from(
          `<svg width="390" height="120">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b1b26"/>
      <stop offset="1" stop-color="#0b0b0f"/>
    </linearGradient>
  </defs>
  <rect width="390" height="120" fill="url(#g)"/>
  <text x="28" y="68" font-size="24" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, Roboto">daaysorn</text>
  <text x="28" y="98" font-size="14" fill="rgba(255,255,255,0.72)" font-family="system-ui, -apple-system, Segoe UI, Roboto">In your pocket</text>
</svg>`
        )
      : Buffer.from(
          `<svg width="390" height="120">
  <rect width="390" height="120" fill="#000000"/>
  <text x="28" y="74" font-size="22" fill="rgba(255,255,255,0.9)" font-family="system-ui, -apple-system, Segoe UI, Roboto">daaysorn</text>
</svg>`
        )

  await bg
    .composite([
      { input: topLabel, top: 0, left: 0 },
      { input: shadow, top: 96, left: 10 },
      { input: shot, top: 112, left: 24 },
      { input: strokeOverlay(shotW, shotH, 32), top: 112, left: 24 },
    ])
    .png()
    .toFile(out)
}

await makeWide("a")
await makeNarrow("a")
await makeWide("b")
await makeNarrow("b")

console.log("Rendered Play Store-style screenshots.")
