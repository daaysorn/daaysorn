import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

export const ogSize = {
  width: 1200,
  height: 630,
}

export const ogVariants = [
  "editorial-dark",
  "glass-identity",
  "light-swiss",
  "split-contrast",
  "product-constellation",
] as const

export type OgVariant = (typeof ogVariants)[number]

const palette = {
  black: "#070707",
  charcoal: "#111111",
  softBlack: "#191919",
  white: "#f7f7f4",
  muted: "#a4a4a4",
  line: "rgba(255,255,255,0.14)",
  darkLine: "rgba(7,7,7,0.14)",
}

function Noise({ light = false }: { light?: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        overflow: "hidden",
      }}
    >
      {Array.from({ length: 128 }, (_, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: (index * 89) % ogSize.width,
            top: (index * 53) % ogSize.height,
            width: index % 5 === 0 ? 2 : 1,
            height: index % 5 === 0 ? 2 : 1,
            borderRadius: 999,
            background: light ? "rgba(7,7,7,0.12)" : "rgba(255,255,255,0.13)",
          }}
        />
      ))}
    </div>
  )
}

function Portrait({
  src,
  size,
  background = palette.black,
}: {
  src: string
  size: number
  background?: string
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.2)",
        background,
        position: "relative",
      }}
    >
      <Noise />
      {/* next/image is not supported inside next/og ImageResponse output. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={Math.round(size * 1.45)}
        height={Math.round(size * 0.97)}
        style={{ objectFit: "contain", position: "relative" }}
      />
    </div>
  )
}

function BrandLine({ color = palette.white }: { color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        color,
        fontFamily: "Geist",
        fontSize: 23,
        letterSpacing: "0.02em",
      }}
    >
      Founder&nbsp;&nbsp;·&nbsp;&nbsp;Designer&nbsp;&nbsp;·&nbsp;&nbsp;Builder
    </div>
  )
}

function EditorialDark({ portrait }: { portrait: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: palette.black,
        color: palette.white,
        padding: "70px 76px",
      }}
    >
      <Noise />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 720,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Montserrat",
              fontSize: 102,
              fontWeight: 700,
              letterSpacing: "-0.065em",
              lineHeight: 1,
            }}
          >
            daaysorn
          </div>
          <div
            style={{
              width: 620,
              height: 1,
              background: palette.line,
              marginTop: 34,
              marginBottom: 29,
              display: "flex",
            }}
          />
          <BrandLine />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontFamily: "Geist",
            fontSize: 18,
            color: palette.muted,
          }}
        >
          Tomiwa David&nbsp;&nbsp;·&nbsp;&nbsp;Lagos, Nigeria
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 74,
          top: 112,
          display: "flex",
        }}
      >
        <Portrait src={portrait} size={354} />
      </div>
      <div
        style={{
          position: "absolute",
          right: 80,
          bottom: 67,
          display: "flex",
          fontFamily: "Geist",
          fontSize: 15,
          color: "rgba(255,255,255,0.46)",
        }}
      >
        daaysorn.com
      </div>
    </div>
  )
}

function GlassIdentity({ portrait }: { portrait: string }) {
  const labels = ["Software", "IoT", "Commerce", "Clothing", "Meals"]

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 75% 20%, #343434 0%, #141414 38%, #080808 76%)",
        color: palette.white,
      }}
    >
      <Noise />
      <div
        style={{
          width: 1050,
          height: 474,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 54px 42px",
          borderRadius: 44,
          border: "1px solid rgba(255,255,255,0.28)",
          background: "rgba(255,255,255,0.085)",
          boxShadow: "0 28px 90px rgba(0,0,0,0.36)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <Portrait src={portrait} size={250} background="#111111" />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginLeft: 54,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Montserrat",
                fontSize: 78,
                fontWeight: 700,
                letterSpacing: "-0.055em",
                lineHeight: 1,
              }}
            >
              daaysorn
            </div>
            <div style={{ display: "flex", marginTop: 22 }}>
              <BrandLine />
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontFamily: "Geist",
                fontSize: 18,
                color: "rgba(255,255,255,0.56)",
              }}
            >
              Thoughtful brands and useful products.
            </div>
          </div>
        </div>
        <div
          style={{
            height: 58,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.22)",
            padding: "0 24px",
          }}
        >
          {labels.map((label, index) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                fontFamily: "Geist",
                fontSize: 15,
                color: index === 0 ? palette.white : "rgba(255,255,255,0.5)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  display: "flex",
                  borderRadius: 99,
                  background:
                    index === 0 ? palette.white : "rgba(255,255,255,0.28)",
                  marginRight: 9,
                }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LightSwiss({ portrait }: { portrait: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        padding: "62px 72px 56px",
        background: palette.white,
        color: palette.black,
      }}
    >
      <Noise light />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          position: "relative",
        }}
      >
        <div style={{ display: "flex" }} />
        <div
          style={{
            display: "flex",
            fontFamily: "Geist",
            fontSize: 15,
            color: "rgba(7,7,7,0.52)",
          }}
        >
          Lagos · NG
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Montserrat",
            fontSize: 118,
            fontWeight: 700,
            letterSpacing: "-0.072em",
            lineHeight: 0.92,
          }}
        >
          daaysorn
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 30,
            color: palette.black,
          }}
        >
          <BrandLine color={palette.black} />
        </div>
      </div>
      <div
        style={{
          height: 1,
          width: "100%",
          background: palette.darkLine,
          display: "flex",
          position: "relative",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            maxWidth: 570,
            fontFamily: "Geist",
            fontSize: 21,
            lineHeight: 1.35,
            color: "rgba(7,7,7,0.62)",
          }}
        >
          I shape brands, build products, and connect the details that make them
          feel whole.
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              marginRight: 20,
              fontFamily: "Geist",
            }}
          >
            <span style={{ display: "flex", fontSize: 17 }}>Tomiwa David</span>
            <span
              style={{
                display: "flex",
                fontSize: 14,
                color: "rgba(7,7,7,0.46)",
                marginTop: 4,
              }}
            >
              daaysorn.com
            </span>
          </div>
          <Portrait src={portrait} size={112} background={palette.white} />
        </div>
      </div>
    </div>
  )
}

function SplitContrast({ portrait }: { portrait: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: palette.white,
      }}
    >
      <div
        style={{
          width: "56%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 68px 58px",
          background: palette.black,
          color: palette.white,
          position: "relative",
        }}
      >
        <Noise />
        <div
          style={{
            display: "flex",
            fontFamily: "Montserrat",
            fontSize: 250,
            fontWeight: 700,
            letterSpacing: "-0.08em",
            lineHeight: 0.76,
            position: "relative",
          }}
        >
          d
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <BrandLine />
          <span
            style={{
              display: "flex",
              fontFamily: "Geist",
              fontSize: 16,
              color: "rgba(255,255,255,0.48)",
              marginTop: 18,
            }}
          >
            daaysorn.com
          </span>
        </div>
      </div>
      <div
        style={{
          width: "44%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: palette.white,
          color: palette.black,
          padding: 48,
          position: "relative",
        }}
      >
        <Noise light />
        <Portrait src={portrait} size={292} background={palette.white} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 30,
            fontFamily: "Geist",
            position: "relative",
          }}
        >
          <span style={{ display: "flex", fontSize: 27, fontWeight: 600 }}>
            Tomiwa David
          </span>
          <span
            style={{
              display: "flex",
              fontSize: 17,
              color: "rgba(7,7,7,0.5)",
              marginTop: 7,
            }}
          >
            behind daaysorn
          </span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 375,
          top: 202,
          display: "flex",
          fontFamily: "Montserrat",
          fontSize: 77,
          fontWeight: 700,
          color: palette.white,
          letterSpacing: "-0.055em",
        }}
      >
        daaysorn
      </div>
    </div>
  )
}

function ProductConstellation({ portrait }: { portrait: string }) {
  const nodes = [
    { label: "Software + Engineering", left: 82, top: 178 },
    { label: "Internet of Things", left: 118, top: 404 },
    { label: "Ecommerce", left: 832, top: 152 },
    { label: "Clothing", left: 914, top: 316 },
    { label: "Meals", left: 824, top: 472 },
  ]

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% 48%, #242424 0%, #101010 34%, #070707 72%)",
        color: palette.white,
      }}
    >
      <Noise />
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 52,
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            display: "flex",
            fontFamily: "Montserrat",
            fontSize: 43,
            fontWeight: 700,
            letterSpacing: "-0.05em",
          }}
        >
          daaysorn
        </span>
        <span
          style={{
            display: "flex",
            width: 92,
            height: 1,
            background: palette.line,
            margin: "0 18px",
          }}
        />
        <span
          style={{
            display: "flex",
            fontFamily: "Geist",
            fontSize: 16,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          One connected body of work
        </span>
      </div>
      {nodes.map((node, index) => (
        <div
          key={node.label}
          style={{
            position: "absolute",
            left: node.left,
            top: node.top,
            display: "flex",
            alignItems: "center",
            height: 48,
            padding: "0 18px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.17)",
            background: "rgba(255,255,255,0.055)",
            fontFamily: "Geist",
            fontSize: 15,
            color: index === 0 ? palette.white : "rgba(255,255,255,0.64)",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              display: "flex",
              borderRadius: 99,
              background:
                index === 0 ? palette.white : "rgba(255,255,255,0.34)",
              marginRight: 10,
            }}
          />
          {node.label}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: 441,
          top: 133,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Portrait src={portrait} size={318} />
        <span
          style={{
            display: "flex",
            fontFamily: "Montserrat",
            fontSize: 29,
            fontWeight: 700,
            marginTop: 23,
          }}
        >
          Tomiwa David
        </span>
        <span
          style={{
            display: "flex",
            fontFamily: "Geist",
            fontSize: 16,
            color: "rgba(255,255,255,0.5)",
            marginTop: 8,
          }}
        >
          Founder · Designer · Builder
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          right: 65,
          bottom: 42,
          display: "flex",
          fontFamily: "Geist",
          fontSize: 14,
          color: "rgba(255,255,255,0.42)",
        }}
      >
        daaysorn.com
      </div>
    </div>
  )
}

async function loadOgAssets() {
  const [portraitBuffer, montserrat, geist] = await Promise.all([
    readFile(join(process.cwd(), "public/images/logo.png")),
    readFile(
      join(
        process.cwd(),
        "node_modules/@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf"
      )
    ),
    readFile(
      join(
        process.cwd(),
        "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf"
      )
    ),
  ])

  return {
    portrait: `data:image/png;base64,${portraitBuffer.toString("base64")}`,
    fonts: [
      {
        name: "Montserrat",
        data: Uint8Array.from(montserrat).buffer,
        weight: 700 as const,
        style: "normal" as const,
      },
      {
        name: "Geist",
        data: Uint8Array.from(geist).buffer,
        weight: 400 as const,
        style: "normal" as const,
      },
      {
        name: "Geist",
        data: Uint8Array.from(geist).buffer,
        weight: 600 as const,
        style: "normal" as const,
      },
    ],
  }
}

export async function renderOgImage(variant: OgVariant) {
  const { portrait, fonts } = await loadOgAssets()

  const artwork = {
    "editorial-dark": <EditorialDark portrait={portrait} />,
    "glass-identity": <GlassIdentity portrait={portrait} />,
    "light-swiss": <LightSwiss portrait={portrait} />,
    "split-contrast": <SplitContrast portrait={portrait} />,
    "product-constellation": <ProductConstellation portrait={portrait} />,
  }[variant]

  return new ImageResponse(artwork, {
    ...ogSize,
    fonts,
  })
}
