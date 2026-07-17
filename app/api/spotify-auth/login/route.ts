// Thin shim — all logic lives in the component folder.
import { spotifyLogin } from "@/components/daaysorn-cmp/spotify/auth"

export const dynamic = "force-dynamic"

export const GET = spotifyLogin
