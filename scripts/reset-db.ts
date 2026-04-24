/**
 * DANGER: Drops the entire MongoDB database referenced by MONGODB_URI.
 *
 * Usage:
 *   $env:CONFIRM_RESET_DB="YES"; npx tsx scripts/reset-db.ts
 *
 * Requires MONGODB_URI in .env.local
 */

import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

async function main() {
  if (process.env.CONFIRM_RESET_DB !== "YES") {
    console.error('❌ Refusing to reset DB. Set CONFIRM_RESET_DB="YES" to proceed.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not set. Add it to .env.local");
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(uri);

  const dbName = mongoose.connection.name;
  console.log(`⚠️  Dropping database: ${dbName}`);
  await mongoose.connection.dropDatabase();
  console.log("✅ Dropped\n");

  await mongoose.disconnect();
  console.log("🔌 Disconnected. Done!");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});

