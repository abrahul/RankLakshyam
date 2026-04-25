/**
 * Seeds the legacy `levels` collection with fixed IDs required by existing exam data.
 *
 * Usage:
 *   npx tsx scripts/seed-levels.ts
 *
 * Requires MONGODB_URI in .env.local
 */

import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

const LEVELS = [
  {
    _id: new mongoose.Types.ObjectId("69eb17104b807113840d298c"),
    name: "10th_level",
    displayName: { en: "10th level", ml: "" },
    sortOrder: 0,
  },
  {
    _id: new mongoose.Types.ObjectId("69eb17104b807113840d298d"),
    name: "plus2_level",
    displayName: { en: "12th level", ml: "" },
    sortOrder: 1,
  },
  {
    _id: new mongoose.Types.ObjectId("69eb17104b807113840d298e"),
    name: "degree_level",
    displayName: { en: "degree level", ml: "" },
    sortOrder: 2,
  },
  {
    _id: new mongoose.Types.ObjectId("69eb17114b807113840d298f"),
    name: "other_exams",
    displayName: { en: "others", ml: "" },
    sortOrder: 3,
  },
] as const;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set. Add it to .env.local");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);

  const levels = mongoose.connection.collection("levels");
  let created = 0;
  let updated = 0;

  for (const level of LEVELS) {
    const existing = await levels.findOne({ _id: level._id }, { projection: { _id: 1 } });
    await levels.updateOne(
      { _id: level._id },
      {
        $set: {
          name: level.name,
          displayName: level.displayName,
          sortOrder: level.sortOrder,
        },
      },
      { upsert: true }
    );

    if (existing) updated++;
    else created++;

    console.log(`Upserted ${level.displayName.en} -> ${level._id}`);
  }

  const docs = await levels
    .find({}, { projection: { _id: 1, name: 1, displayName: 1, sortOrder: 1 } })
    .sort({ sortOrder: 1 })
    .toArray();

  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log("Current levels:");
  for (const doc of docs) {
    console.log(`- ${doc._id}: ${doc.name} (${doc.displayName?.en ?? ""})`);
  }

  await mongoose.disconnect();
  console.log("Disconnected. Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
