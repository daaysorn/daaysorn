// Thin shim — all logic lives in the component folder.
import { spotifyCallback } from "@/components/daaysorn-cmp/spotify/auth"

export const dynamic = "force-dynamic"

export const GET = spotifyCallback
