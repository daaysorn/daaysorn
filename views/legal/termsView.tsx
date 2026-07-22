import Link from "next/link"

import {
  LegalDocument,
  type LegalSection,
} from "@/components/legal/legal-document"
import { LEGAL_EFFECTIVE_DATE, LEGAL_LAST_UPDATED } from "@/lib/legal/dates"
import { siteConfig } from "@/lib/seo"

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement to these terms",
    content: (
      <>
        <p>
          These Terms of Service (“Terms”) govern your access to and use of{" "}
          <strong>{siteConfig.name}</strong> at{" "}
          <a
            href={siteConfig.url}
            className="min-w-0 break-all"
            rel="noopener noreferrer"
          >
            {siteConfig.url}
          </a>{" "}
          and related surfaces operated by {siteConfig.creator.name}{" "}
          (collectively, the “Site”).
        </p>
        <p>
          By accessing or using the Site, you agree to these Terms and to our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do
          not use the Site.
        </p>
        <p>
          The Site is a personal brand and public body of work. It may include
          writing, media, product experiments, documentation, and interactive
          features such as Rants perspectives and Keeps. Features may change,
          appear, or disappear without notice.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility",
    content: (
      <>
        <p>
          You must be at least 13 years old (or the minimum age of digital
          consent in your country, if higher) to use interactive features that
          collect information. If you use the Site on behalf of an organization,
          you represent that you have authority to bind that organization to
          these Terms.
        </p>
      </>
    ),
  },
  {
    id: "accounts-and-sessions",
    title: "Accounts, sync, and sessions",
    content: (
      <>
        <p>
          Some features (for example Keeps sync) may create device-bound
          credentials or sessions stored in your browser. You are responsible
          for keeping those credentials confidential and for activity that
          occurs under your session.
        </p>
        <p>
          We may suspend or revoke sync sessions, rate-limit requests, or block
          access when we detect abuse, security risk, or Terms violations.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>
            use the Site for any unlawful purpose, or in violation of these
            Terms;
          </li>
          <li>
            harass, threaten, defame, or discriminate against any person or
            group;
          </li>
          <li>
            post or transmit spam, malware, scams, phishing, or content that
            infringes others’ rights;
          </li>
          <li>
            attempt to probe, scan, or test the vulnerability of the Site, or
            bypass security or access controls;
          </li>
          <li>
            scrape, harvest, or bulk-download Site content in a way that burdens
            our infrastructure or violates robots rules, except as allowed by
            ordinary browsing or documented public feeds;
          </li>
          <li>
            impersonate {siteConfig.name}, {siteConfig.creator.name}, or any
            other person or entity;
          </li>
          <li>
            interfere with other users’ enjoyment of the Site, or with Site
            operation.
          </li>
        </ul>
        <p>
          We may investigate and take action we consider appropriate, including
          removing content, restricting features, or reporting conduct to
          authorities.
        </p>
      </>
    ),
  },
  {
    id: "user-content",
    title: "User content (perspectives and similar)",
    content: (
      <>
        <p>
          If you submit content to the Site (“User Content”)—including Rant
          perspectives, replies, display names, or other contributions—you
          retain ownership of your User Content, but you grant {siteConfig.name}{" "}
          a worldwide, non-exclusive, royalty-free, transferable license to
          host, store, reproduce, publish, display, distribute, and otherwise
          use that User Content in connection with operating, promoting, and
          improving the Site and related works.
        </p>
        <p>You represent and warrant that:</p>
        <ul>
          <li>
            you own or have all rights needed to submit the User Content and
            grant the license above;
          </li>
          <li>
            your User Content does not violate law or any third-party rights;
          </li>
          <li>
            your User Content does not contain malicious code or private data of
            others without permission.
          </li>
        </ul>
        <p>
          Contributions may be moderated (including automated screening and
          human review) and may be approved, rejected, edited for formatting, or
          removed at our discretion. Publication is not guaranteed.
        </p>
      </>
    ),
  },
  {
    id: "our-content",
    title: "Our content and intellectual property",
    content: (
      <>
        <p>
          The Site—including text, design, branding, logos, photographs, code,
          layout, and other materials we create or license (excluding User
          Content and third-party marks)—is owned by {siteConfig.creator.name} /{" "}
          {siteConfig.name} or our licensors and is protected by intellectual
          property laws.
        </p>
        <p>
          You may view and share links to public pages for personal,
          non-commercial use. You may not copy, modify, distribute, sell, or
          create derivative works from Site materials for commercial purposes
          without prior written permission, except where a separate open-source
          or component license expressly allows it (for example published{" "}
          {siteConfig.name} component registry packages under their stated
          licenses).
        </p>
        <p>
          “{siteConfig.name}” and related brand elements must be written and
          used as described on the Site. Do not suggest endorsement or
          affiliation without permission.
        </p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "Third-party services and links",
    content: (
      <>
        <p>
          The Site may link to or integrate third-party services (for example
          Spotify, social networks, analytics, hosting, realtime providers, or
          external documentation). We do not control those services and are not
          responsible for their content, availability, or practices. Your use of
          third-party services is governed by their terms and privacy policies.
        </p>
      </>
    ),
  },
  {
    id: "disclaimer",
    title: "Disclaimer of warranties",
    content: (
      <>
        <p>
          The Site is provided on an <strong>“as is”</strong> and{" "}
          <strong>“as available”</strong> basis, without warranties of any kind,
          whether express, implied, or statutory—including implied warranties of
          merchantability, fitness for a particular purpose, title, and
          non-infringement—to the fullest extent permitted by law.
        </p>
        <p>
          We do not warrant that the Site will be uninterrupted, secure, or
          error-free; that defects will be corrected; or that content is
          accurate, complete, or current. Opinion pieces, Rants, and experiments
          are personal expression and not professional advice (legal, financial,
          medical, or otherwise).
        </p>
      </>
    ),
  },
  {
    id: "limitation",
    title: "Limitation of liability",
    content: (
      <>
        <p>
          To the fullest extent permitted by law, {siteConfig.creator.name},{" "}
          {siteConfig.name}, and our suppliers will not be liable for any
          indirect, incidental, special, consequential, exemplary, or punitive
          damages; or any loss of profits, data, goodwill, or other intangible
          losses arising from your use of (or inability to use) the Site—even if
          advised of the possibility of such damages.
        </p>
        <p>
          To the fullest extent permitted by law, our total liability for any
          claim arising out of or relating to the Site or these Terms will not
          exceed the greater of (a) the amount you paid us (if any) to use the
          Site in the twelve months before the claim, or (b) one hundred US
          dollars (USD $100).
        </p>
        <p>
          Some jurisdictions do not allow certain limitations; in those places,
          our liability is limited to the maximum extent permitted by law.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    content: (
      <>
        <p>
          You agree to defend, indemnify, and hold harmless{" "}
          {siteConfig.creator.name} and {siteConfig.name} from and against any
          claims, damages, losses, and expenses (including reasonable legal
          fees) arising out of or related to your User Content, your use of the
          Site, or your violation of these Terms or applicable law.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    content: (
      <>
        <p>
          We may suspend or terminate access to some or all of the Site at any
          time, with or without notice, including if you breach these Terms. You
          may stop using the Site at any time. Provisions that by their nature
          should survive (including ownership, licenses already granted,
          disclaimers, limitations, and indemnity) will survive termination.
        </p>
      </>
    ),
  },
  {
    id: "changes-to-terms",
    title: "Changes to these terms",
    content: (
      <>
        <p>
          We may update these Terms from time to time. We will revise the “Last
          updated” date on this page when we do. Material changes may also be
          highlighted on the Site. Continued use after changes take effect
          constitutes acceptance of the updated Terms. If you do not agree, stop
          using the Site.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law and disputes",
    content: (
      <>
        <p>
          These Terms are governed by the laws of the Federal Republic of
          Nigeria, without regard to conflict-of-law principles, except where
          mandatory consumer protections in your country of residence apply and
          cannot be waived.
        </p>
        <p>
          Before filing a formal dispute, you agree to contact us at{" "}
          <a href={`mailto:${siteConfig.creator.email}`}>
            {siteConfig.creator.email}
          </a>{" "}
          and attempt to resolve the issue informally in good faith. If a
          dispute remains unresolved, courts located in Lagos, Nigeria will have
          exclusive jurisdiction, except where applicable law gives you the
          right to bring claims in your local courts.
        </p>
      </>
    ),
  },
  {
    id: "general",
    title: "General",
    content: (
      <>
        <p>
          These Terms, together with the{" "}
          <Link href="/privacy">Privacy Policy</Link>, are the entire agreement
          between you and us regarding the Site and supersede prior agreements
          on that subject. If any provision is found unenforceable, the
          remaining provisions remain in effect. Our failure to enforce a
          provision is not a waiver. You may not assign these Terms without our
          consent; we may assign them in connection with a transfer of the Site.
          Headings are for convenience only.
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
          Questions about these Terms:
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
          Related document: <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </>
    ),
  },
]

export function TermsView() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Terms of Service"
      description={`The rules for using ${siteConfig.name}—including acceptable use, user contributions, intellectual property, and limitations of liability.`}
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={sections}
      relatedHref="/privacy"
      relatedLabel="Privacy Policy"
    />
  )
}
