import Link from "next/link"
import type { IconType } from "react-icons"
import { FaEnvelope, FaGithub } from "react-icons/fa6"
import { RiInstagramFill, RiTwitterXLine } from "react-icons/ri"

import { FlipClock } from "@/components/daaysorn-cmp/flipclock"
import { NowPlaying } from "@/components/daaysorn-cmp/spotify"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

const Footer = () => {
  const currentYear = new Date().getFullYear()
  const appName = process.env.NEXT_PUBLIC_APP_NAME

  return (
    <footer className="flex w-full flex-col gap-3 py-8 text-center font-medium md:fixed md:bottom-5 md:flex-row md:items-center md:gap-4 md:py-0 md:text-left">
      {/** mobile: clock & copyright are separate ordered rows; md: paired inline */}
      <div className="contents md:order-1 md:flex md:items-center md:gap-x-3 md:justify-start">
        <div className="order-1 flex justify-center text-sm text-muted-foreground md:justify-start">
          <FlipClock />
        </div>
        <div className="order-3 flex justify-center text-sm text-muted-foreground md:justify-start">
          <span className="font-semibold">
            &copy; <span className="text-primary">{appName}'s</span> {currentYear}
          </span>
        </div>
      </div>

      {/** now playing / last played (Spotify) */}
      <div className="order-2 flex justify-center md:order-2 md:justify-start">
        <NowPlaying />
      </div>

      {/** social media */}
      <TooltipProvider delayDuration={150} skipDelayDuration={100}>
        <div className="order-4 flex items-center justify-center gap-5 text-primary md:order-3 md:justify-start md:gap-3">
          {socialLinks.map(({ href, icon: Icon, label }) => (
            <Tooltip key={label}>
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
                  className="inline-flex opacity-80 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-110 hover:opacity-100"
                >
                  <Icon className="size-4 text-primary" />
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={8}
                className="text-xs duration-200 ease-out"
              >
                {label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </footer>
  )
}

export default Footer
