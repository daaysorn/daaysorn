import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { ogVariants, renderOgImage } from "../lib/og-image"

const outputDirectory = join(process.cwd(), ".artifacts/og-previews")

await mkdir(outputDirectory, { recursive: true })

for (const variant of ogVariants) {
  const response = await renderOgImage(variant)
  const image = Buffer.from(await response.arrayBuffer())
  const outputPath = join(outputDirectory, `${variant}.png`)

  await writeFile(outputPath, image)
  console.log(`${variant}: ${outputPath}`)
}
