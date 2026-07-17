import Link from "next/link"
import type { IconType } from "react-icons"
import { FaEnvelope, FaGithub } from "react-icons/fa6"
import { FaSquareXTwitter } from "react-icons/fa6"
import { RiInstagramFill } from "react-icons/ri"

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
    icon: FaSquareXTwitter,
    label: "X",
  },
  {
    href: `mailto:${process.env.NEXT_PUBLIC_SOCIAL_USERNAME}@example.com`,
    icon: FaEnvelope,
    label: "Email",
  },
]

const Footer = () => {
  const currentYear = new Date().getFullYear()
  const appName = process.env.NEXT_PUBLIC_APP_NAME

  return (
    <footer className="fixed bottom-5 flex w-full gap-4 font-medium">
      {/** copyright */}
      <div>
        <p className="text-sm text-muted-foreground">
          &copy; {currentYear} /{" "}
          <span className="font-semibold text-primary">{appName}</span>{" "}
        </p>
      </div>

      {/** spotify player */}
      <div>
        <p className="text-sm text-muted-foreground">
          last played -{" "}
          <span className="font-semibold text-primary">Song Name</span> by
          Artist Name
        </p>
      </div>

      {/** social media */}
      <TooltipProvider delayDuration={150} skipDelayDuration={100}>
        <div className="flex items-center gap-3 text-primary">
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
                  <Icon size={20} className="text-primary" />
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
