"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import type { IconType } from "react-icons"
import {
  FaEnvelope,
  FaGithub,
  FaHouse,
  FaMoon,
  FaPen,
  FaSun,
} from "react-icons/fa6"
import { RiInstagramFill, RiTwitterXLine } from "react-icons/ri"

import { buttonVariants } from "@/components/ui/button"
import { Dock, DockIcon } from "@/components/ui/dock"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const navItems: {
  href: string
  icon: IconType
  label: string
}[] = [
  { href: "/", icon: FaHouse, label: "Home" },
  { href: "/docs", icon: FaPen, label: "Docs" },
]

const socialLinks: {
  href: string
  icon: IconType
  label: string
}[] = [
  {
    href: `https://github.com/${process.env.NEXT_PUBLIC_SOCIAL_USERNAME}`,
    icon: FaGithub,
    label: "GitHub",
  },
  {
    href: `https://www.instagram.com/${process.env.NEXT_PUBLIC_SOCIAL_USERNAME}`,
    icon: RiInstagramFill,
    label: "Instagram",
  },
  {
    href: `https://x.com/${process.env.NEXT_PUBLIC_SOCIAL_USERNAME}`,
    icon: RiTwitterXLine,
    label: "X",
  },
  {
    href: `mailto:${process.env.NEXT_PUBLIC_APP_NAME?.split(" ")[0]?.toLowerCase()}@${process.env.NEXT_PUBLIC_SOCIAL_USERNAME}.com`,
    icon: FaEnvelope,
    label: "Email",
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
      <Tooltip>
        <TooltipTrigger asChild>
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
              <FaSun className="size-4 text-primary" />
            ) : (
              <FaMoon className="size-4 text-primary" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {mounted ? label : "Toggle theme"}
        </TooltipContent>
      </Tooltip>
    </DockIcon>
  )
}

const Header = () => {
  return (
    <header
      className={cn(
        "z-50 flex w-full justify-center max-watch:hidden",
        // mobile: pinned bottom dock (above home indicator)
        "fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] px-6",
        // md+: back to top of the shell column
        "md:static md:inset-auto md:bottom-auto md:px-0"
      )}
    >
      <TooltipProvider delayDuration={150} skipDelayDuration={100}>
        <Dock direction="middle" className="mt-0">
          {navItems.map(({ href, icon: Icon, label }) => (
            <DockIcon key={label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    aria-label={label}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "size-12 rounded-full"
                    )}
                  >
                    <Icon className="size-4 text-primary" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  {label}
                </TooltipContent>
              </Tooltip>
            </DockIcon>
          ))}
          <Separator orientation="vertical" className="h-full" />
          {socialLinks.map(({ href, icon: Icon, label }) => (
            <DockIcon key={label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    target={href.startsWith("mailto:") ? undefined : "_blank"}
                    rel={
                      href.startsWith("mailto:")
                        ? undefined
                        : "noopener noreferrer"
                    }
                    aria-label={label}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "size-12 rounded-full"
                    )}
                  >
                    <Icon className="size-4 text-primary" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  {label}
                </TooltipContent>
              </Tooltip>
            </DockIcon>
          ))}
          <Separator orientation="vertical" className="h-full" />
          <ThemeToggle />
        </Dock>
      </TooltipProvider>
    </header>
  )
}

export default Header
