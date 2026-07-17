import Image from "next/image"
import Link from "next/link"
import { Fragment } from "react"
import {
  PiBowlFoodFill,
  PiBracketsCurlyDuotone,
  PiCoatHangerFill,
  PiLightningFill,
  PiShoppingCartSimpleFill,
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
          something and products that look good and work well.
        </p>

        <p className="clear-none mt-5">
          My work brings together how a brand feels, how a product looks, and
          how people use it. I care about the details people notice, the parts
          that quietly make everything work, and the clarity that holds it all
          together.
        </p>

        <p className="clear-both mt-5">
          You can follow how I make this website in the{" "}
          <a
            href={links.code.repositoryHref}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            daaysorn repository
          </a>
          . It is where I share how ideas grow into clear, useful products and
          how I make each part feel considered.{" "}
          <a
            href={links.code.componentsHref}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            daaysorn-cmp
          </a>{" "}
          is my collection of ready-made building blocks. I use it to keep my
          products familiar, easy to use, and consistent wherever they appear.
        </p>

        <p className="mt-5">
          My products include{" "}
          {links.products.map((product, index) => {
            const ProductIcon = productIcons[product.key]

            return (
              <Fragment key={product.label}>
                {index > 0 ? ", " : null}
                <HoverCard openDelay={120} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <Link
                      href={product.href}
                      className={`${linkClassName} inline-flex items-center gap-1 align-baseline`}
                    >
                      <ProductIcon
                        aria-hidden="true"
                        className="size-[1em] shrink-0 text-primary"
                      />
                      {product.label}
                    </Link>
                  </HoverCardTrigger>
                  <HoverCardContent
                    side="top"
                    className="w-72 overflow-hidden border-foreground/15 bg-popover/75 p-2 shadow-2xl ring-1 ring-white/10 backdrop-blur-2xl"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-foreground/10 bg-linear-to-br from-primary/20 via-background to-muted p-5">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--primary)_24%,transparent),transparent_58%)]" />
                      <div className="relative flex h-full flex-col justify-between">
                        <ProductIcon
                          aria-hidden="true"
                          className="size-8 text-primary"
                        />
                        <div className="min-w-0">
                          <p className="font-heading text-sm leading-tight font-semibold text-foreground">
                            {product.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </Fragment>
            )
          })}
          . Developer-ready documentation for integrating with daaysorn is
          available in{" "}
          <Link href={links.documentation.href} className={linkClassName}>
            {links.documentation.label}
          </Link>
          . They may look different, but they share one goal: to feel clear,
          connected, and made with care.
        </p>

        <p className="mt-5">
          Access is connected too. One{" "}
          {accountHref ? (
            <a href={accountHref} className={linkClassName}>
              daaysorn account
            </a>
          ) : (
            <span className="font-medium text-foreground">
              daaysorn account
            </span>
          )}{" "}
          gives you access across my products, much like one Google Account
          works across Google&apos;s services. You sign in once and move between
          daaysorn products without starting over each time.
        </p>

        <p className="mt-5">
          You can see the work as it develops on{" "}
          <a
            href={links.code.profileHref}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            GitHub
          </a>
          , or follow along on{" "}
          <a
            href={links.social.instagramHref}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            Instagram
          </a>{" "}
          and{" "}
          <a
            href={links.social.xHref}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            X
          </a>
          .
        </p>

        <p className="mt-5">
          If you have a brand to shape or a product worth making,{" "}
          <a href={links.contact.href} className={linkClassName}>
            get in touch
          </a>
          .
        </p>
      </div>
    </article>
  )
}

export default HomeView
