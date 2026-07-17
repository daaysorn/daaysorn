import { HomeView } from "@/views"
import { homeStructuredData } from "@/lib/seo"

const Page = () => {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <HomeView />
    </>
  )
}

export default Page
