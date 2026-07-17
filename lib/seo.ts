const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://daaysorn.vercel.app"

export const siteConfig = {
  name: "daaysorn",
  title: "daaysorn | Tomiwa David",
  description:
    "daaysorn is the home of Tomiwa David, a founder, designer, and builder creating thoughtful brands and useful products across digital and physical spaces.",
  url: siteUrl,
  locale: "en_NG",
  creator: {
    name: "Tomiwa David",
    handle: "@daaysorn",
    email: "david@daaysorn.com",
  },
  keywords: [
    "daaysorn",
    "Tomiwa David",
    "founder",
    "designer",
    "product designer",
    "software engineering",
    "Internet of Things",
    "ecommerce",
    "design systems",
    "Nigeria",
  ],
  social: {
    github: "https://github.com/daaysorn",
    instagram: "https://www.instagram.com/daaysorn",
    x: "https://x.com/daaysorn",
  },
} as const

export const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${siteConfig.url}/#person`,
      name: siteConfig.creator.name,
      alternateName: siteConfig.name,
      url: siteConfig.url,
      image: `${siteConfig.url}/images/logo.png`,
      email: `mailto:${siteConfig.creator.email}`,
      jobTitle: "Founder, Designer, and Builder",
      sameAs: Object.values(siteConfig.social),
      knowsAbout: [
        "Brand design",
        "Product design",
        "Software engineering",
        "Internet of Things",
        "Ecommerce",
        "Design systems",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.description,
      inLanguage: "en-NG",
      publisher: {
        "@id": `${siteConfig.url}/#person`,
      },
    },
  ],
}
