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

function gradientBackground(
  width: number,
  height: number,
  mode: "wide" | "narrow"
) {
  const accents =
    mode === "wide"
      ? `<radialGradient id="a" cx="20%" cy="10%" r="70%">
  <stop offset="0%" stop-color="#6d28d9" stop-opacity="0.34"/>
  <stop offset="55%" stop-color="#0b0b0f" stop-opacity="0"/>
</radialGradient>
<radialGradient id="b" cx="85%" cy="25%" r="65%">
  <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.22"/>
  <stop offset="60%" stop-color="#0b0b0f" stop-opacity="0"/>
</radialGradient>
<radialGradient id="c" cx="60%" cy="95%" r="75%">
  <stop offset="0%" stop-color="#f97316" stop-opacity="0.14"/>
  <stop offset="55%" stop-color="#0b0b0f" stop-opacity="0"/>
</radialGradient>`
      : `<radialGradient id="a" cx="35%" cy="10%" r="80%">
  <stop offset="0%" stop-color="#6d28d9" stop-opacity="0.34"/>
  <stop offset="60%" stop-color="#0b0b0f" stop-opacity="0"/>
</radialGradient>
<radialGradient id="b" cx="85%" cy="30%" r="70%">
  <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.22"/>
  <stop offset="62%" stop-color="#0b0b0f" stop-opacity="0"/>
</radialGradient>`

  return Buffer.from(
    `<svg width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0b0f"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    ${accents}
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#a)" filter="url(#blur)"/>
  <rect width="${width}" height="${height}" fill="url(#b)" filter="url(#blur)"/>
  ${mode === "wide" ? `<rect width="${width}" height="${height}" fill="url(#c)" filter="url(#blur)"/>` : ""}
</svg>`
  )
}

async function makeWide() {
  const out = "public/screenshots/playstore-wide-gradient.png"
  const base = sharp("public/screenshots/home-wide.png")
  const bg = sharp(gradientBackground(1280, 720, "wide"))

  const shotW = 1040
  const shotH = 585
  const shot = await base
    .resize(shotW, shotH, { fit: "cover" })
    .composite([{ input: roundedMask(shotW, shotH, 28), blend: "dest-in" }])
    .png()
    .toBuffer()

  const shadow = await sharp({
    create: {
      width: shotW + 44,
      height: shotH + 44,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${shotW + 44}" height="${shotH + 44}"><rect x="22" y="22" width="${shotW}" height="${shotH}" rx="28" ry="28" fill="rgba(0,0,0,0.55)"/></svg>`
        ),
      },
    ])
    .blur(18)
    .png()
    .toBuffer()

  const header = Buffer.from(
    `<svg width="1280" height="160">
  <text x="64" y="86" font-size="34" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, Roboto">daaysorn</text>
  <text x="64" y="122" font-size="18" fill="rgba(255,255,255,0.72)" font-family="system-ui, -apple-system, Segoe UI, Roboto">Keeps · Gallery · Rants</text>
</svg>`
  )

  await bg
    .composite([
      { input: header, top: 0, left: 0 },
      { input: shadow, top: 160, left: 98 },
      { input: shot, top: 182, left: 120 },
      { input: strokeOverlay(shotW, shotH, 28), top: 182, left: 120 },
    ])
    .png()
    .toFile(out)
}

async function makeNarrow() {
  const out = "public/screenshots/playstore-narrow-gradient.png"
  const base = sharp("public/screenshots/home-narrow.png")
  const bg = sharp(gradientBackground(390, 844, "narrow"))

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

  const header = Buffer.from(
    `<svg width="390" height="140">
  <text x="28" y="82" font-size="24" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, Roboto">daaysorn</text>
  <text x="28" y="112" font-size="14" fill="rgba(255,255,255,0.72)" font-family="system-ui, -apple-system, Segoe UI, Roboto">In your pocket</text>
</svg>`
  )

  await bg
    .composite([
      { input: header, top: 0, left: 0 },
      { input: shadow, top: 96, left: 10 },
      { input: shot, top: 112, left: 24 },
      { input: strokeOverlay(shotW, shotH, 32), top: 112, left: 24 },
    ])
    .png()
    .toFile(out)
}

await makeWide()
await makeNarrow()

console.log("Rendered gradient Play Store-style screenshots.")
