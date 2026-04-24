/**
 * Seed script for the category system.
 *
 * Reads exam_index_complete.json and populates:
 *   1. levels collection (4 records)
 *   2. exams collection (all exams linked to their level)
 *
 * Usage:
 *   npx tsx scripts/seed-categories.ts
 *
 * Requires MONGODB_URI in .env.local
 */

import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";

// Load .env/.env.local the same way Next.js does (avoids requiring dotenv as a dependency).
loadEnvConfig(process.cwd());

// ── Inline schemas to avoid path alias issues in scripts ──

const LEVEL_NAMES = ["10th_level", "plus2_level", "degree_level", "other_exams"] as const;
type LevelName = (typeof LEVEL_NAMES)[number];

const LevelSchema = new mongoose.Schema(
  {
    name: { type: String, enum: LEVEL_NAMES, required: true, unique: true },
    displayName: {
      en: { type: String, required: true },
      ml: { type: String, default: "" },
    },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
const Level = mongoose.models.Level || mongoose.model("Level", LevelSchema);

const ExamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, default: null, sparse: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: "Level", required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);
ExamSchema.index({ code: 1 });
ExamSchema.index({ levelId: 1 });
ExamSchema.index({ name: 1, levelId: 1 }, { unique: true });
const Exam = mongoose.models.Exam || mongoose.model("Exam", ExamSchema);

// ── Level display names ──

const LEVEL_DISPLAY: Record<LevelName, { en: string; ml: string }> = {
  "10th_level": { en: "10th Level (SSLC)", ml: "പത്താം ക്ലാസ്" },
  "plus2_level": { en: "Plus Two Level", ml: "പ്ലസ് ടു" },
  "degree_level": { en: "Degree Level", ml: "ഡിഗ്രി" },
  "other_exams": { en: "Other Exams", ml: "മറ്റ് പരീക്ഷകൾ" },
};

// ── Main ──

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not set. Add it to .env.local");
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("✅ Connected\n");

  // 1. Seed levels
  console.log("📦 Seeding levels...");
  const levelMap: Record<string, mongoose.Types.ObjectId> = {};

  for (let i = 0; i < LEVEL_NAMES.length; i++) {
    const name = LEVEL_NAMES[i];
    const display = LEVEL_DISPLAY[name];
    const level = await Level.findOneAndUpdate(
      { name },
      { $set: { displayName: display, sortOrder: i } },
      { upsert: true, new: true }
    );
    levelMap[name] = level._id;
    console.log(`  ✅ ${name} → ${level._id}`);
  }

  // 2. Read exam_index_complete.json
  const jsonPath = path.resolve(__dirname, "../src/lib/examfilter/exam_index_complete.json");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const examIndex: Record<string, Array<{ exam: string; code: string | null; note?: string }>> =
    JSON.parse(raw);

  // 3. Seed exams
  console.log("\n📦 Seeding exams...");
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const levelName of Object.keys(examIndex)) {
    const levelId = levelMap[levelName];
    if (!levelId) {
      console.log(`  ⚠️ Unknown level "${levelName}", skipping`);
      continue;
    }

    const exams = examIndex[levelName];
    for (const entry of exams) {
      try {
        const result = await Exam.findOneAndUpdate(
          { name: entry.exam, levelId },
          {
            $set: {
              code: entry.code || null,
              note: entry.note || "",
            },
          },
          { upsert: true, new: true, rawResult: true }
        );
        if (result.lastErrorObject?.updatedExisting) {
          updated++;
        } else {
          created++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("duplicate key")) {
          skipped++;
        } else {
          console.error(`  ❌ Error seeding "${entry.exam}": ${msg}`);
        }
      }
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (duplicates): ${skipped}`);

  // 4. Verify counts
  const totalLevels = await Level.countDocuments();
  const totalExams = await Exam.countDocuments();
  console.log(`\n✅ Database now has ${totalLevels} levels and ${totalExams} exams.`);

  await mongoose.disconnect();
  console.log("🔌 Disconnected. Done!");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
