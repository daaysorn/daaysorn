"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import type { IconType } from "react-icons"
import { LuMoon, LuSun } from "react-icons/lu"
import {
  PiBowlFoodFill,
  PiDesktopTowerFill,
  PiEnvelopeSimpleFill,
  PiFileTextFill,
  PiLightningFill,
  PiShoppingCartSimpleFill,
  PiTShirtFill,
} from "react-icons/pi"
import { RiHome5Fill } from "react-icons/ri"

import { buttonVariants } from "@/components/ui/button"
import { Dock, DockIcon } from "@/components/ui/dock"
import { cn } from "@/lib/utils"

const navItems: {
  href: string
  icon: IconType
  label: string
}[] = [
  { href: "/", icon: RiHome5Fill, label: "Home" },
  { href: "/docs", icon: PiFileTextFill, label: "Docs" },
  { href: "/tech", icon: PiDesktopTowerFill, label: "Tech" },
  {
    href: "/energy-and-power",
    icon: PiLightningFill,
    label: "Energy and Power",
  },
  {
    href: "/ecommerce",
    icon: PiShoppingCartSimpleFill,
    label: "Ecommerce",
  },
  { href: "/wears", icon: PiTShirtFill, label: "Wears" },
  { href: "/food", icon: PiBowlFoodFill, label: "Food" },
  {
    href: `mailto:${process.env.NEXT_PUBLIC_APP_NAME?.split(" ")[0]?.toLowerCase()}@${process.env.NEXT_PUBLIC_SOCIAL_USERNAME}.com`,
    icon: PiEnvelopeSimpleFill,
    label: "Contact",
  },
]

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

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

/**
 * Shows the viewer's country flag (from IP) and exposes its timezone
 * abbreviation to assistive technology. Refreshes after travel.
 */
function CountryBadge() {
  const [country, setCountry] = React.useState<CountryInfo | null>(null)

  const load = React.useEffectEvent(async () => {
    try {
      const res = await fetch("/api/geo", { cache: "no-store" })
      if (!res.ok) return

      const data = (await res.json()) as {
        countryCode: string | null
        country: string | null
        timezoneAbbr: string | null
      }

      if (!data.countryCode) return

      setCountry({
        code: data.countryCode,
        name: data.country ?? data.countryCode,
        flag: flagEmoji(data.countryCode),
        timezoneAbbr: data.timezoneAbbr,
      })
    } catch {
      // Keep last known country on transient failures.
    }
  })

  React.useEffect(() => {
    void load()

    const onFocus = () => {
      void load()
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus()
    }

    window.addEventListener("focus", onFocus)
    window.addEventListener("online", onFocus)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("online", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return (
    <DockIcon>
      <span
        aria-label={
          country
            ? `${country.name}${country.timezoneAbbr ? ` (${country.timezoneAbbr})` : ""}`
            : "Country"
        }
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-12 rounded-full"
        )}
      >
        {country ? (
          <span className="text-base leading-none">{country.flag}</span>
        ) : (
          <span className="size-4 animate-pulse rounded-full bg-muted" />
        )}
      </span>
    </DockIcon>
  )
}

const Header = () => {
  const pathname = usePathname()

  return (
    <header
      className={cn(
        "z-50 flex w-full justify-center max-watch:hidden before:pointer-events-none before:absolute before:inset-x-0 before:bottom-[calc(-1*max(1rem,env(safe-area-inset-bottom)))] before:h-32 before:bg-linear-to-b before:from-transparent before:via-background/80 before:to-background before:content-['']",
        // mobile: pinned bottom dock (above home indicator)
        "fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] px-6",
        // md+: back to top of the shell column
        "md:static md:inset-auto md:bottom-auto md:px-0 md:before:hidden"
      )}
    >
      <Dock
        direction="middle"
        className="relative z-10 mt-0 scale-[0.68] gap-0.5 p-1 xs:max-md:scale-80 md:scale-100 md:gap-2 md:p-2"
      >
        {navItems.map(({ href, icon: Icon, label }) => {
          const isRoute = href.startsWith("/")
          const isActive =
            isRoute &&
            (href === "/"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`))

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
