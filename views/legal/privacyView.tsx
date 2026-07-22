import Link from "next/link"

import {
  LegalDocument,
  type LegalSection,
} from "@/components/legal/legal-document"
import { LEGAL_EFFECTIVE_DATE, LEGAL_LAST_UPDATED } from "@/lib/legal/dates"
import { siteConfig } from "@/lib/seo"

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    content: (
      <>
        <p>
          This Privacy Policy explains how <strong>{siteConfig.name}</strong>{" "}
          (“we,” “us,” or “our”) collects, uses, stores, and shares information
          when you visit or use{" "}
          <a
            href={siteConfig.url}
            className="min-w-0 break-all"
            rel="noopener noreferrer"
          >
            {siteConfig.url}
          </a>{" "}
          and related surfaces operated by {siteConfig.creator.name} (together,
          the “Site”).
        </p>
        <p>
          {siteConfig.name} is a personal brand and public body of work based in
          Lagos, Nigeria. It is not a registered company name in this notice.
          The Site may include a home profile, writing (“Rants”), a media
          gallery, saved links (“Keeps”), documentation, and other product or
          brand surfaces we publish over time.
        </p>
        <p>
          Contact for privacy requests:{" "}
          <a href={`mailto:${siteConfig.creator.email}`}>
            {siteConfig.creator.email}
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "scope",
    title: "Scope of this policy",
    content: (
      <>
        <p>This policy applies to information processed when you:</p>
        <ul>
          <li>browse or use the Site as a visitor;</li>
          <li>submit a perspective or reply on a Rant;</li>
          <li>use Keeps, gallery features, or similar interactive tools;</li>
          <li>install or use our progressive web app (PWA) where available;</li>
          <li>contact us by email or through linked social channels.</li>
        </ul>
        <p>
          It does not control how third-party sites, apps, or services (for
          example Instagram, GitHub, X, Spotify, or Google) handle your data
          when you leave the Site or interact with their products. Their own
          privacy notices apply there.
        </p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    content: (
      <>
        <p>
          We collect only what we need to run and improve the Site. Categories
          include:
        </p>

        <p>
          <strong>Information you provide.</strong> When you submit a Rant
          perspective or reply, you may share a display name and the text of
          your contribution. If you email us, we receive the address and content
          you send. If you sync Keeps across devices, we store sync credentials
          and the keep identifiers you choose to sync, along with an optional
          device display name.
        </p>

        <p>
          <strong>Information collected automatically.</strong> Like most
          websites, we and our processors may receive technical data such as IP
          address, browser type, device type, referring URL, pages viewed,
          approximate location derived from IP, timestamps, and diagnostic or
          performance signals. Google Analytics may collect similar measurement
          data when enabled on the Site.
        </p>

        <p>
          <strong>Local device storage.</strong> The Site may store data in your
          browser (for example <code>localStorage</code>) for preferences, Keeps
          favourites, sync session secrets, display names, theme choice, and
          PWA-related state. This data stays on your device unless a feature
          syncs it to our servers.
        </p>

        <p>
          <strong>Cookies and similar technologies.</strong> We may use cookies
          or similar technologies for security (for example short-lived OAuth
          state cookies when connecting Spotify for the “now playing”
          experience), analytics, and basic site operation. Your browser
          settings can block or delete cookies; some features may then work less
          well.
        </p>

        <p>
          <strong>Third-party content and embeds.</strong> Features such as
          Spotify “now playing,” Ably-powered realtime updates, Cloudflare or
          Vercel hosting, and link previews may cause those providers to process
          technical data under their own terms when you use the related feature.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "How we use information",
    content: (
      <>
        <p>We use information to:</p>
        <ul>
          <li>operate, secure, and maintain the Site and its features;</li>
          <li>
            publish, moderate, and display user contributions (including Rant
            perspectives) after review where applicable;
          </li>
          <li>sync Keeps and related state across devices you authorize;</li>
          <li>
            measure traffic and feature usage (including via Google Analytics)
            so we can understand what works and fix problems;
          </li>
          <li>respond to messages and support requests;</li>
          <li>detect abuse, spam, fraud, and security incidents;</li>
          <li>
            comply with law, enforce our Terms of Service, and protect rights
            and safety.
          </li>
        </ul>
        <p>
          We do not sell your personal information. We do not use the Site to
          serve third-party advertising networks against visitor profiles.
        </p>
      </>
    ),
  },
  {
    id: "legal-bases",
    title: "Legal bases (where applicable)",
    content: (
      <>
        <p>
          If you are in a region that requires a lawful basis for processing
          (for example the EEA, UK, or similar frameworks), we rely on one or
          more of the following, depending on the activity:
        </p>
        <ul>
          <li>
            <strong>Legitimate interests</strong> — operating a personal site,
            securing it, understanding aggregate usage, and moderating public
            discussion in a way that does not override your rights;
          </li>
          <li>
            <strong>Consent</strong> — where we ask for it, or where your
            browser settings and voluntary use of optional features imply it
            (for example analytics cookies where consent is required);
          </li>
          <li>
            <strong>Contract / steps at your request</strong> — providing
            features you choose to use, such as submitting a perspective or
            enabling Keeps sync;
          </li>
          <li>
            <strong>Legal obligation</strong> — when we must retain or disclose
            information to comply with applicable law.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "user-contributions",
    title: "User contributions (Rants perspectives)",
    content: (
      <>
        <p>
          Perspectives and replies you submit may be reviewed before they appear
          publicly. Approved contributions, including the display name you
          provide, may be shown on the Site and associated surfaces.
        </p>
        <p>
          Do not include sensitive personal data, passwords, private contact
          details of others, or unlawful content in contributions. We may
          refuse, edit visibility of, or remove contributions that violate our
          Terms of Service or community standards.
        </p>
        <p>
          If you want a published contribution removed, contact{" "}
          <a href={`mailto:${siteConfig.creator.email}`}>
            {siteConfig.creator.email}
          </a>{" "}
          with enough detail for us to find it. We will consider requests in
          good faith, subject to technical and legal limits.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "How we share information",
    content: (
      <>
        <p>We may share information with:</p>
        <ul>
          <li>
            <strong>Service providers</strong> who help us host, deliver,
            analyze, or secure the Site (for example hosting platforms,
            analytics providers, realtime messaging, storage, and email
            infrastructure), under obligations to use data only for their
            services to us;
          </li>
          <li>
            <strong>The public</strong>, when you submit content intended for
            publication (such as an approved Rant perspective);
          </li>
          <li>
            <strong>Authorities or other parties</strong> when required by law,
            court order, or to protect rights, safety, or security;
          </li>
          <li>
            <strong>Successors</strong>, if the Site or related assets are
            transferred as part of a reorganization or similar event, with
            notice where reasonably possible.
          </li>
        </ul>
        <p>
          Current operational processors may include providers such as Vercel
          (hosting), Google (Analytics), Spotify (now-playing integration when
          configured), Ably (realtime), Cloudflare (where used for storage or
          edge), and Telegram (for internal moderation workflows). The exact set
          can change as the Site evolves; those providers process data under
          their own privacy terms.
        </p>
      </>
    ),
  },
  {
    id: "international-transfers",
    title: "International transfers",
    content: (
      <>
        <p>
          We are based in Nigeria. Service providers and visitors may be located
          in other countries. Information may be processed in jurisdictions with
          different data-protection rules than your home country. Where
          required, we take reasonable steps to ensure appropriate safeguards
          for such transfers through our providers’ contractual and technical
          measures.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "Retention",
    content: (
      <>
        <p>
          We keep information only as long as needed for the purposes described
          in this policy, unless a longer period is required or permitted by
          law.
        </p>
        <ul>
          <li>
            Analytics and server logs are typically retained according to our
            providers’ defaults or our operational needs, then deleted or
            aggregated.
          </li>
          <li>
            Published perspectives may remain available while the related Rant
            and Site exist, unless removed earlier.
          </li>
          <li>
            Keeps sync data remains while your sync session is active or until
            you clear it / we delete inactive accounts for abuse or inactivity.
          </li>
          <li>
            Email correspondence is retained as needed to respond and keep a
            reasonable business record.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    content: (
      <>
        <p>
          We use reasonable technical and organizational measures to protect
          information (for example HTTPS, access controls, and httpOnly cookies
          for sensitive OAuth state). No method of transmission or storage is
          completely secure. You use the Site at your own risk regarding
          residual security risk.
        </p>
        <p>
          If you believe your interaction with the Site has been compromised,
          contact us promptly at{" "}
          <a href={`mailto:${siteConfig.creator.email}`}>
            {siteConfig.creator.email}
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your choices and rights",
    content: (
      <>
        <p>Depending on where you live, you may have rights to:</p>
        <ul>
          <li>access personal information we hold about you;</li>
          <li>correct inaccurate information;</li>
          <li>request deletion, subject to legal or operational exceptions;</li>
          <li>object to or restrict certain processing;</li>
          <li>withdraw consent where processing is consent-based;</li>
          <li>
            lodge a complaint with a supervisory authority in your region.
          </li>
        </ul>
        <p>
          To exercise these rights, email{" "}
          <a href={`mailto:${siteConfig.creator.email}`}>
            {siteConfig.creator.email}
          </a>{" "}
          with enough detail to verify and fulfill your request. You can also
          clear cookies and local storage in your browser, and adjust analytics
          or tracking preferences through browser and OS settings where
          available.
        </p>
        <p>
          California and similar US state laws: we do not “sell” or “share”
          personal information for cross-context behavioral advertising as those
          terms are commonly defined. You may still contact us to make
          access/deletion requests as described above.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: (
      <>
        <p>
          The Site is not directed at children under 13 (or the minimum age
          required in your country). We do not knowingly collect personal
          information from children. If you believe a child has provided us
          information, contact us and we will take appropriate steps to delete
          it.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time. When we do, we
          will revise the “Last updated” date at the top of this page and, where
          changes are material, take additional notice steps that are reasonable
          in context (for example a note on the Site). Continued use of the Site
          after an update means you acknowledge the revised policy.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <>
        <p>
          Privacy questions, requests, and complaints:
          <br />
          {siteConfig.creator.name} / {siteConfig.name}
          <br />
          Email:{" "}
          <a href={`mailto:${siteConfig.creator.email}`}>
            {siteConfig.creator.email}
          </a>
          <br />
          Location: Lagos, Nigeria
        </p>
        <p>
          Related document: <Link href="/terms">Terms of Service</Link>.
        </p>
      </>
    ),
  },
]

export function PrivacyView() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Privacy Policy"
      description={`How ${siteConfig.name} collects, uses, and protects information when you visit the Site, contribute to Rants, use Keeps, or otherwise interact with our surfaces.`}
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={sections}
      relatedHref="/terms"
      relatedLabel="Terms of Service"
    />
  )
}
