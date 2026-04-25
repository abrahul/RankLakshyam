/**
 * Removes the legacy `level` field from question documents.
 *
 * Usage:
 *   $env:CONFIRM_CLEANUP_QUESTION_LEVEL="YES"; npx tsx scripts/cleanup-question-level.ts
 *
 * Requires MONGODB_URI in .env.local
 */

import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

async function main() {
  if (process.env.CONFIRM_CLEANUP_QUESTION_LEVEL !== "YES") {
    console.error('Refusing cleanup. Set CONFIRM_CLEANUP_QUESTION_LEVEL="YES" to proceed.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set. Add it to .env.local");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);

  const questions = mongoose.connection.collection("questions");
  const before = await questions.countDocuments({ level: { $exists: true } });
  console.log(`Questions with legacy level before cleanup: ${before}`);

  if (before === 0) {
    await mongoose.disconnect();
    console.log("Nothing to clean up.");
    return;
  }

  const result = await questions.updateMany(
    { level: { $exists: true } },
    { $unset: { level: "" } }
  );

  const after = await questions.countDocuments({ level: { $exists: true } });
  console.log(`Matched: ${result.matchedCount}`);
  console.log(`Modified: ${result.modifiedCount}`);
  console.log(`Questions with legacy level after cleanup: ${after}`);

  await mongoose.disconnect();
  console.log("Disconnected. Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
