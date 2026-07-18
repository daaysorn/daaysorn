import { NextResponse } from "next/server"

type GeoPayload = {
  countryCode: string | null
  country: string | null
  timezone: string | null
  timezoneAbbr: string | null
}

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? null
  } catch {
    return null
  }
}

function timezoneAbbr(timeZone: string) {
  try {
    const parts = (timeZoneName: "short" | "long") =>
      new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? null

    const short = parts("short")
    // Prefer real abbreviations (WAT, EST…) over numeric GMT/UTC offsets
    if (short && !/^(GMT|UTC)([+-]\d+(\.\d+)?)?$/i.test(short)) {
      return short
    }

    const long = parts("long")
    if (long) {
      // "West Africa Standard Time" → "West Africa Time" → "WAT"
      const words = long
        .replace(/\b(standard|daylight|summer)\b/gi, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
      if (words.length >= 2) {
        return words
          .map((w) => w[0]!)
          .join("")
          .toUpperCase()
      }
    }

    return short
  } catch {
    return null
  }
}

function payload(
  code: string,
  name: string | null,
  timezone: string | null
): GeoPayload {
  return {
    countryCode: code,
    country: name ?? countryName(code),
    timezone,
    timezoneAbbr: timezone ? timezoneAbbr(timezone) : null,
  }
}

function fromHeaders(headers: Headers): GeoPayload | null {
  const code = (
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    headers.get("x-country-code")
  )?.toUpperCase()

  if (!code || code === "XX" || code.length !== 2) {
    return null
  }

  const timezone =
    headers.get("x-vercel-ip-timezone") ?? headers.get("cf-timezone") ?? null

  return payload(code, countryName(code), timezone)
}

function isLoopbackOrPrivate(ip: string | null) {
  return (
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  )
}

async function fromGeoJs(ip: string | null): Promise<GeoPayload | null> {
  const url =
    ip && !isLoopbackOrPrivate(ip)
      ? `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`
      : "https://get.geojs.io/v1/ip/geo.json"

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return null

    const data = (await res.json()) as {
      country_code?: string
      country?: string
      timezone?: string
      name?: string
    }

    const code = (data.country_code ?? data.country)?.toUpperCase()
    if (!code || code.length !== 2) return null

    return payload(code, data.name ?? null, data.timezone ?? null)
  } catch {
    return null
  }
}

function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null
  }
  return headers.get("x-real-ip")
}

export async function GET(request: Request) {
  const headerGeo = fromHeaders(request.headers)

  // Vercel normally supplies both values. Only call GeoJS when something is
  // missing, avoiding a third-party request on every header load.
  const fallback =
    headerGeo?.countryCode && headerGeo.timezone
      ? null
      : await fromGeoJs(clientIp(request.headers))

  const merged: GeoPayload = {
    countryCode: fallback?.countryCode ?? headerGeo?.countryCode ?? null,
    country: fallback?.country ?? headerGeo?.country ?? null,
    timezone: fallback?.timezone ?? headerGeo?.timezone ?? null,
    timezoneAbbr:
      fallback?.timezoneAbbr ??
      headerGeo?.timezoneAbbr ??
      (fallback?.timezone ? timezoneAbbr(fallback.timezone) : null) ??
      (headerGeo?.timezone ? timezoneAbbr(headerGeo.timezone) : null),
  }

  return NextResponse.json(merged, {
    headers: {
      "Cache-Control": merged.countryCode
        ? "private, max-age=86400"
        : "private, max-age=3600",
    },
  })
}
