"use client"

import Image from "next/image"
import Link from "next/link"
import { Fragment, type ReactNode, useState } from "react"
import {
  PiArrowUpRightBold,
  PiBowlFoodFill,
  PiBracketsCurlyDuotone,
  PiBrowserFill,
  PiCoatHangerFill,
  PiCubeFill,
  PiEnvelopeSimpleFill,
  PiGithubLogoFill,
  PiInstagramLogoFill,
  PiLightningFill,
  PiNotebookFill,
  PiShoppingCartSimpleFill,
  PiUserCircleFill,
  PiXLogoFill,
} from "react-icons/pi"
import type { IconType } from "react-icons"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/daaysorn-cmp/spotify/ui/hover-card"
import links from "@/json/links.json"

const linkClassName =
  "rounded-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

const productIcons: Record<string, IconType> = {
  tech: PiBracketsCurlyDuotone,
  energy: PiLightningFill,
  ecommerce: PiShoppingCartSimpleFill,
  wears: PiCoatHangerFill,
  food: PiBowlFoodFill,
}

type PreviewLinkProps = {
  href: string
  label: string
  description: string
  icon: IconType
  children?: ReactNode
  external?: boolean
  className?: string
  logoSrc?: string
}

const passthroughImageLoader = ({ src }: { src: string }) => src

const SitePreview = ({
  href,
  label,
  icon: Icon,
  logoSrc,
}: Pick<PreviewLinkProps, "href" | "label" | "icon" | "logoSrc">) => {
  const [loading, setLoading] = useState(true)
  const isWebsite = href.startsWith("http")
  const isLocalPage = href.startsWith("/")
  const previewSrc = isWebsite
    ? `https://api.microlink.io/?url=${encodeURIComponent(href)}&screenshot=true&meta=false&embed=screenshot.url`
    : href

  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-black/10 bg-muted dark:border-white/10">
      {loading && (isWebsite || isLocalPage) ? (
        <div className="absolute inset-0 z-10 animate-pulse bg-muted">
          <div className="h-7 border-b border-border/70 bg-background/70" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-2/3 rounded-full bg-foreground/10" />
            <div className="h-3 w-full rounded-full bg-foreground/8" />
            <div className="h-3 w-4/5 rounded-full bg-foreground/8" />
            <div className="mt-5 h-10 w-28 rounded-lg bg-primary/10" />
          </div>
        </div>
      ) : null}

      {isWebsite ? (
        <Image
          loader={passthroughImageLoader}
          unoptimized
          fill
          src={previewSrc}
          alt={`Preview of ${label}`}
          sizes="18rem"
          className="object-cover object-top"
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      ) : isLocalPage ? (
        <iframe
          src={previewSrc}
          title={`Preview of ${label}`}
          tabIndex={-1}
          loading="lazy"
          className="pointer-events-none absolute inset-0 h-[200%] w-[200%] origin-top-left scale-50 border-0 bg-background"
          onLoad={() => setLoading(false)}
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-linear-to-br from-primary/15 via-card to-muted">
          <Icon aria-hidden="true" className="size-10 text-primary" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-white/10 bg-background/88 px-3 py-2 backdrop-blur-xl dark:bg-background/82">
        <div className="flex min-w-0 items-center gap-2">
          {logoSrc ? (
            <span
              aria-hidden="true"
              className="h-3.5 w-10 shrink-0 bg-[length:auto_100%] bg-left bg-no-repeat"
              style={{ backgroundImage: `url(${logoSrc})` }}
            />
          ) : (
            <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
          )}
          <span className="truncate font-heading text-xs font-semibold text-foreground">
            {label}
          </span>
        </div>
        <PiArrowUpRightBold
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground"
        />
      </div>
    </div>
  )
}

const PreviewLink = ({
  href,
  label,
  icon: Icon,
  children,
  external = false,
  className = "",
  logoSrc,
}: PreviewLinkProps) => (
  <HoverCard openDelay={120} closeDelay={100}>
    <HoverCardTrigger asChild>
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={`${linkClassName} ${className}`}
      >
        {children ?? label}
      </Link>
    </HoverCardTrigger>
    <HoverCardContent
      side="top"
      className="w-80 overflow-hidden border-black/10 bg-background/90 p-2 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.45)] ring-1 ring-black/5 backdrop-blur-2xl dark:border-white/15 dark:bg-card/90 dark:ring-white/10"
    >
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        aria-label={`Open ${label}`}
        className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <SitePreview href={href} label={label} icon={Icon} logoSrc={logoSrc} />
      </Link>
    </HoverCardContent>
  </HoverCard>
)

const HomeView = () => {
  const accountHref = links.account.createHref.trim()

  return (
    <article className="min-w-0 pb-8 md:pb-24">
      <h1 className="text-4xl leading-none font-bold tracking-tight xs:text-5xl md:text-3xl">
        Tomiwa David
      </h1>

      <div className="mt-8 min-w-0 text-base leading-8 text-muted-foreground md:mt-7 md:text-lg md:leading-9">
        <div
          style={{
            backgroundImage:
              "radial-gradient(circle, color-mix(in oklch, var(--foreground) 70%, transparent) 0 0.65px, transparent 0.85px), radial-gradient(circle, color-mix(in oklch, var(--foreground) 45%, transparent) 0 0.55px, transparent 0.8px)",
            backgroundPosition: "0 0, 1px 2px",
            backgroundSize: "3px 3px, 5px 5px",
          }}
          className="relative float-right mb-4 ml-5 size-32 overflow-hidden rounded-full border border-foreground/20 bg-background shadow-xl shadow-background/40 [shape-outside:circle()] xs:ml-7 xs:size-36 md:mb-6 md:size-44"
        >
          <Image
            src="/images/logo.png"
            alt="Tomiwa David"
            fill
            priority
            sizes="(min-width: 768px) 11rem, (min-width: 360px) 9rem, 8rem"
            className="scale-[1.6] object-contain"
          />
        </div>

        <p>
          I&apos;m a founder, designer, and builder. I create brands that mean
          something and products that look good and work well. I turn ideas into
          clear experiences people can understand and enjoy. I&apos;m also a
          Christian, growing in faith with{" "}
          <PreviewLink
            href={links.faith.href}
            label={links.faith.label}
            description="A church family helping me grow in faith and know Christ more deeply."
            icon={PiBrowserFill}
            logoSrc={links.faith.logoHref}
            external
          >
            <span
              aria-hidden="true"
              className="mr-1 inline-block h-[0.8em] w-9 bg-[length:auto_100%] bg-left bg-no-repeat align-baseline"
              style={{ backgroundImage: `url(${links.faith.logoHref})` }}
            />
            {links.faith.label}
          </PreviewLink>
          .
        </p>

        <p className="clear-none mt-5">
          My work brings together how a brand feels, how a product looks, and
          how people use it. I care about the details people notice, the parts
          that quietly make everything work, and the clarity that holds it all
          together.
        </p>

        <p className="clear-both mt-5">
          You can follow how I make this website in the{" "}
          <PreviewLink
            href={links.code.repositoryHref}
            label="daaysorn repository"
            description="See how this website is designed and built in public."
            icon={PiGithubLogoFill}
            external
          >
            daaysorn repository
          </PreviewLink>
          . It is where I share how ideas grow into clear, useful products and
          how I make each part feel considered.{" "}
          <PreviewLink
            href={links.code.componentsHref}
            label="daaysorn-cmp"
            description="Reusable building blocks shared across my products."
            icon={PiCubeFill}
            external
          >
            daaysorn-cmp
          </PreviewLink>{" "}
          is my collection of ready-made building blocks. It works with{" "}
          <PreviewLink
            href={links.platforms.shadcn.href}
            label={links.platforms.shadcn.label}
            description="A source-first component system for building your own interface library."
            icon={PiCubeFill}
            external
          >
            {links.platforms.shadcn.label}
          </PreviewLink>
          , Next.js, React, Tailwind CSS, and registry-based installs. I use it
          to keep my products familiar, easy to use, and consistent wherever
          they appear.
        </p>

        <p className="mt-5">
          My product spans across{" "}
          {links.products.map((product, index) => {
            const ProductIcon = productIcons[product.key]

            return (
              <Fragment key={product.label}>
                {index > 0
                  ? index === links.products.length - 1
                    ? ", and "
                    : ", "
                  : null}
                <PreviewLink
                  href={product.href}
                  label={product.label}
                  description={product.description}
                  icon={ProductIcon}
                  className="inline-flex items-center gap-1 align-baseline"
                >
                  <ProductIcon
                    aria-hidden="true"
                    className="size-[1em] shrink-0 text-primary"
                  />
                  {product.label}
                </PreviewLink>
              </Fragment>
            )
          })}
          . Every product follows the daaysorn design system so it feels clear,
          familiar, and consistent. I have made developer-ready documentation
          for integrating with{" "}
          <PreviewLink
            href={links.brand.href}
            label="daaysorn"
            description="One connected home for the products I create."
            icon={PiBrowserFill}
          >
            daaysorn
          </PreviewLink>{" "}
          available in{" "}
          <PreviewLink
            href={links.documentation.href}
            label={links.documentation.label}
            description="Developer-ready guidance for connecting with daaysorn."
            icon={PiNotebookFill}
          >
            {links.documentation.label}
          </PreviewLink>
          . They may look different, but they share one goal: to feel clear,
          connected, and made with care.
        </p>

        <p className="mt-5">
          Access is connected too. One{" "}
          <PreviewLink
            href={accountHref || links.brand.href}
            label="daaysorn account"
            description="One account for moving easily between every daaysorn product."
            icon={PiUserCircleFill}
            external={accountHref.startsWith("http")}
          >
            daaysorn account
          </PreviewLink>{" "}
          gives you access across my products, much like one Google Account
          works across Google&apos;s services. You sign in once and move between{" "}
          <PreviewLink
            href={links.brand.href}
            label="daaysorn"
            description="Explore the connected products and experiences from daaysorn."
            icon={PiBrowserFill}
          >
            daaysorn
          </PreviewLink>{" "}
          products without starting over each time.
        </p>

        <p className="mt-5">
          You can see the work as it develops on{" "}
          <PreviewLink
            href={links.code.profileHref}
            label="GitHub"
            description="Follow the code and projects as they develop."
            icon={PiGithubLogoFill}
            external
          >
            GitHub
          </PreviewLink>
          , or follow along on{" "}
          <PreviewLink
            href={links.social.instagramHref}
            label="Instagram"
            description="See visual notes, ideas, and work in progress."
            icon={PiInstagramLogoFill}
            external
          >
            Instagram
          </PreviewLink>{" "}
          and{" "}
          <PreviewLink
            href={links.social.xHref}
            label="X"
            description="Follow short updates and thoughts along the way."
            icon={PiXLogoFill}
            external
          >
            X
          </PreviewLink>
          .
        </p>

        <p className="mt-5">
          If you have a brand to shape or a product worth making,{" "}
          <PreviewLink
            href={links.contact.href}
            label="Get in touch"
            description="Start a conversation about a brand, product, or new idea."
            icon={PiEnvelopeSimpleFill}
          >
            get in touch
          </PreviewLink>
          .
        </p>
      </div>
    </article>
  )
}

export default HomeView
