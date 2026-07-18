export function limitSentences(value: string, maximum = 2) {
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" })
  return [...segmenter.segment(value)]
    .slice(0, maximum)
    .map(({ segment }) => segment)
    .join("")
    .trim()
}
