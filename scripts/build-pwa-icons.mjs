import sharp from "sharp"

const source = "app/icon.png"
const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const { width, height } = info
const pixelCount = width * height
const visited = new Uint8Array(pixelCount)
let largestComponent = []

function isColoredForeground(pixel) {
  const red = data[pixel * 4]
  const green = data[pixel * 4 + 1]
  const blue = data[pixel * 4 + 2]
  const alpha = data[pixel * 4 + 3]
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum

  return alpha >= 128 && saturation >= 0.08
}

for (let start = 0; start < pixelCount; start += 1) {
  if (visited[start] || !isColoredForeground(start)) continue

  const component = []
  const queue = [start]
  visited[start] = 1

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]
    component.push(current)
    const x = current % width
    const y = Math.floor(current / width)

    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        if (offsetX === 0 && offsetY === 0) continue
        const nextX = x + offsetX
        const nextY = y + offsetY
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) {
          continue
        }

        const next = nextY * width + nextX
        if (!visited[next] && isColoredForeground(next)) {
          visited[next] = 1
          queue.push(next)
        }
      }
    }
  }

  if (component.length > largestComponent.length) {
    largestComponent = component
  }
}

const core = new Uint8Array(pixelCount)
for (const pixel of largestComponent) {
  core[pixel] = 1
}

const closedCore = new Uint8Array(core)
for (const pixel of largestComponent) {
  const x = pixel % width
  const y = Math.floor(pixel / width)

  for (let offsetY = -3; offsetY <= 3; offsetY += 1) {
    for (let offsetX = -3; offsetX <= 3; offsetX += 1) {
      const nextX = x + offsetX
      const nextY = y + offsetY
      if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
        closedCore[nextY * width + nextX] = 1
      }
    }
  }
}

const outside = new Uint8Array(pixelCount)
const outsideQueue = []

function queueOutside(pixel) {
  if (!closedCore[pixel] && !outside[pixel]) {
    outside[pixel] = 1
    outsideQueue.push(pixel)
  }
}

for (let x = 0; x < width; x += 1) {
  queueOutside(x)
  queueOutside((height - 1) * width + x)
}
for (let y = 0; y < height; y += 1) {
  queueOutside(y * width)
  queueOutside(y * width + width - 1)
}

for (let cursor = 0; cursor < outsideQueue.length; cursor += 1) {
  const pixel = outsideQueue[cursor]
  const x = pixel % width
  const y = Math.floor(pixel / width)
  if (x > 0) queueOutside(pixel - 1)
  if (x + 1 < width) queueOutside(pixel + 1)
  if (y > 0) queueOutside(pixel - width)
  if (y + 1 < height) queueOutside(pixel + width)
}

const keep = new Uint8Array(pixelCount)
for (let pixel = 0; pixel < pixelCount; pixel += 1) {
  if (!outside[pixel]) keep[pixel] = 1
}

for (let pixel = 0; pixel < pixelCount; pixel += 1) {
  if (!keep[pixel]) data[pixel * 4 + 3] = 0
}

const transparentIcon = await sharp(data, {
  raw: { width, height, channels: 4 },
})
  .png({ compressionLevel: 9 })
  .toBuffer()

await Promise.all([
  sharp(transparentIcon).resize(512, 512).toFile("app/icon.png"),
  sharp(transparentIcon).resize(180, 180).toFile("app/apple-icon.png"),
  sharp(transparentIcon).resize(192, 192).toFile("public/icons/pwa-192.png"),
  sharp(transparentIcon).resize(512, 512).toFile("public/icons/pwa-512.png"),
])

console.log(`Kept ${largestComponent.length} connected foreground pixels.`)
