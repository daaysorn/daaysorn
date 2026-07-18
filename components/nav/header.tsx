"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import type { IconType } from "react-icons"
import { LuMoon, LuSun } from "react-icons/lu"
import {
  PiBracketsCurlyDuotone,
  PiBowlFoodFill,
  PiCoatHangerFill,
  PiLightningFill,
  PiShoppingCartSimpleFill,
} from "react-icons/pi"
import { RiHome5Fill, RiQuillPenFill } from "react-icons/ri"

import { buttonVariants } from "@/components/ui/button"
import { Dock, DockIcon } from "@/components/ui/dock"
import links from "@/json/links.json"
import { cn } from "@/lib/utils"

const productIcons: Record<string, IconType> = {
  tech: PiBracketsCurlyDuotone,
  energy: PiLightningFill,
  ecommerce: PiShoppingCartSimpleFill,
  wears: PiCoatHangerFill,
  food: PiBowlFoodFill,
}

const navItems: { href: string; icon: IconType; label: string }[] = [
  { href: "/", icon: RiHome5Fill, label: "Home" },
  ...links.products.map((product) => ({
    href: product.href,
    icon: productIcons[product.key] ?? RiHome5Fill,
    label: product.label,
  })),
  {
    href: links.documentation.href,
    icon: RiQuillPenFill,
    label: links.documentation.label,
  },
]

const subscribeToHydration = () => () => undefined

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  )

  const isDark = resolvedTheme === "dark"
  const label = isDark ? "Light mode" : "Dark mode"

  return (
    <DockIcon>
      <button
        type="button"
        aria-label={mounted ? label : "Toggle theme"}
        disabled={!mounted}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-12 rounded-full"
        )}
      >
        {mounted && isDark ? (
          <LuSun className="size-4 text-primary" />
        ) : (
          <LuMoon className="size-4 text-primary" />
        )}
      </button>
    </DockIcon>
  )
}

/** ISO 3166 alpha-2 → regional-indicator flag emoji (e.g. "NG" → 🇳🇬). */
function flagEmoji(cc: string) {
  return cc
    .toUpperCase()
    .replace(/[A-Z]/g, (c) =>
      String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)
    )
}

type CountryInfo = {
  code: string
  name: string
  flag: string
  timezoneAbbr: string | null
}

const countryCacheKey = "daaysorn-country"
const countryCacheTtl = 24 * 60 * 60 * 1000

/**
 * Shows the viewer's country flag (from IP) and exposes its timezone
 * abbreviation to assistive technology. Refreshes after travel.
 */
function CountryBadge() {
  const [country, setCountry] = React.useState<CountryInfo | null>(null)
  const lastLoadedAt = React.useRef(0)

  const load = React.useEffectEvent(async () => {
    try {
      const res = await fetch("/api/geo")
      if (!res.ok) return

      const data = (await res.json()) as {
        countryCode: string | null
        country: string | null
        timezoneAbbr: string | null
      }

      if (!data.countryCode) return

      const nextCountry = {
        code: data.countryCode,
        name: data.country ?? data.countryCode,
        flag: flagEmoji(data.countryCode),
        timezoneAbbr: data.timezoneAbbr,
      }
      const cachedAt = Date.now()
      setCountry(nextCountry)
      lastLoadedAt.current = cachedAt
      window.localStorage.setItem(
        countryCacheKey,
        JSON.stringify({ country: nextCountry, cachedAt })
      )
    } catch {
      // Keep last known country on transient failures.
    }
  })

  React.useEffect(() => {
    try {
      const cached = JSON.parse(
        window.localStorage.getItem(countryCacheKey) ?? "null"
      ) as { country?: CountryInfo; cachedAt?: number } | null
      if (
        cached?.country &&
        typeof cached.cachedAt === "number" &&
        Date.now() - cached.cachedAt < countryCacheTtl
      ) {
        setCountry(cached.country)
        lastLoadedAt.current = cached.cachedAt
      }
    } catch {
      window.localStorage.removeItem(countryCacheKey)
    }

    const initialLoad = window.setTimeout(() => {
      if (Date.now() - lastLoadedAt.current >= countryCacheTtl) void load()
    }, 0)

    const onFocus = () => {
      if (Date.now() - lastLoadedAt.current >= countryCacheTtl) void load()
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus()
    }

    window.addEventListener("focus", onFocus)
    window.addEventListener("online", onFocus)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.clearTimeout(initialLoad)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("online", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return (
    <DockIcon>
      {country ? (
        <Link
          href={`https://en.wikipedia.org/wiki/${encodeURIComponent(country.name.replaceAll(" ", "_"))}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Read about ${country.name} on Wikipedia${country.timezoneAbbr ? ` (${country.timezoneAbbr})` : ""}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "size-12 rounded-full"
          )}
        >
          <span className="text-base leading-none">{country.flag}</span>
        </Link>
      ) : (
        <span
          aria-label="Country"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "size-12 rounded-full"
          )}
        >
          <span className="size-4 animate-pulse rounded-full bg-muted" />
        </span>
      )}
    </DockIcon>
  )
}

const Header = () => {
  const pathname = usePathname()

  return (
    <header
      className={cn(
        "z-50 flex w-full justify-center before:absolute before:inset-x-0 before:-bottom-[max(1rem,env(safe-area-inset-bottom))] before:h-32 before:bg-linear-to-b before:from-transparent before:via-background/80 before:to-background before:content-[''] after:pointer-events-none max-watch:hidden md:isolate md:after:absolute md:after:-top-6 md:after:left-1/2 md:after:z-0 md:after:h-36 md:after:w-screen md:after:-translate-x-1/2 md:after:bg-linear-to-b md:after:from-background md:after:via-background md:after:to-transparent md:after:content-['']",
        // mobile: pinned bottom dock (above home indicator)
        "fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] px-6",
        // md+: sticky at the top of the shell column
        "md:sticky md:inset-auto md:top-6 md:bottom-auto md:px-0 md:before:hidden"
      )}
    >
      <Dock
        direction="middle"
        className="relative z-10 mt-0 scale-[0.78] gap-0.5 p-1 xs:max-md:scale-90 md:w-xl md:max-w-[calc(100vw-3rem)] md:shrink-0 md:scale-100 md:justify-between md:gap-2 md:px-5 md:py-2"
      >
        {navItems.map(({ href, icon: Icon, label }) => {
          const isRoute = href.startsWith("/")
          const isKeepsUnderDocs =
            href === links.documentation.href && pathname === "/keeps"
          const isActive =
            isRoute &&
            (isKeepsUnderDocs ||
              (href === "/"
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`)))

          return (
            <DockIcon key={label}>
              <Link
                href={href}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "size-12 rounded-full"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                />
              </Link>
            </DockIcon>
          )
        })}
        <ThemeToggle />
        <CountryBadge />
      </Dock>
    </header>
  )
}

export default Header
