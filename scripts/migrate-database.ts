import { migrateFintechSchema } from "@/lib/fintech/db"
import { migrateGallerySchema } from "@/lib/gallery/db"
import { migrateKeepsSchema } from "@/lib/keeps/db"
import { migrateKeepsSyncSchema } from "@/lib/keeps/sync-db"
import { migrateRantsSchema } from "@/lib/rants/db"

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL is not configured")
}

await migrateKeepsSchema()
await migrateKeepsSyncSchema()
await migrateGallerySchema()
await migrateRantsSchema()
await migrateFintechSchema()

console.log("Database migrations completed.")
