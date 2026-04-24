/**
 * Seed script for the admin-driven category system.
 *
 * Populates:
 *   1. categories collection (4 records)
 *   2. exams collection (all exams linked to their category)
 *
 * Source of truth: src/lib/examfilter/exam_index_complete.json
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

// —— Inline schemas to avoid path alias issues in scripts ——

const CATEGORY_SLUGS = ["10th_level", "plus2_level", "degree_level", "other_exams"] as const;
type CategorySlug = (typeof CATEGORY_SLUGS)[number];

const CategorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: {
      en: { type: String, required: true, trim: true },
      ml: { type: String, default: "", trim: true },
    },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ sortOrder: 1 });
const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);

const ExamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, default: null, sparse: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);
ExamSchema.index({ code: 1 });
ExamSchema.index({ categoryId: 1 });
ExamSchema.index({ name: 1, categoryId: 1 }, { unique: true });
const Exam = mongoose.models.Exam || mongoose.model("Exam", ExamSchema);

// —— Category display names ——

const CATEGORY_DISPLAY: Record<CategorySlug, { en: string; ml: string }> = {
  "10th_level": { en: "10th Level (SSLC)", ml: "പത്താം ക്ലാസ്" },
  "plus2_level": { en: "Plus Two Level", ml: "പ്ലസ് ടു" },
  "degree_level": { en: "Degree Level", ml: "ഡിഗ്രി" },
  "other_exams": { en: "Other Exams", ml: "മറ്റ് പരീക്ഷകൾ" },
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not set. Add it to .env.local");
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("✅ Connected\n");

  // 1. Seed categories
  console.log("📦 Seeding categories...");
  const categoryMap: Record<string, mongoose.Types.ObjectId> = {};

  for (let i = 0; i < CATEGORY_SLUGS.length; i++) {
    const slug = CATEGORY_SLUGS[i];
    const display = CATEGORY_DISPLAY[slug];
    const category = await Category.findOneAndUpdate(
      { slug },
      { $set: { slug, name: display, sortOrder: i } },
      { upsert: true, new: true }
    );
    categoryMap[slug] = category._id;
    console.log(`  ✅ ${slug} → ${category._id}`);
  }

  // 2. Read exam_index_complete.json
  const jsonPath = path.resolve(__dirname, "../src/lib/examfilter/exam_index_complete.json");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const examIndex: Record<string, Array<{ exam: string; code: string | null; note?: string }>> = JSON.parse(raw);

  // 3. Seed exams
  console.log("\n📦 Seeding exams...");
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const slug of Object.keys(examIndex)) {
    const categoryId = categoryMap[slug];
    if (!categoryId) {
      console.log(`  ⚠️ Unknown category "${slug}", skipping`);
      continue;
    }

    const exams = examIndex[slug];
    for (const entry of exams) {
      try {
        const result = await Exam.findOneAndUpdate(
          { name: entry.exam, categoryId },
          {
            $set: {
              code: entry.code || null,
              note: entry.note || "",
            },
          },
          { upsert: true, new: true, rawResult: true }
        );
        if (result.lastErrorObject?.updatedExisting) updated++;
        else created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("duplicate key")) skipped++;
        else console.error(`  ❌ Error seeding "${entry.exam}": ${msg}`);
      }
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (duplicates): ${skipped}`);

  const totalCategories = await Category.countDocuments();
  const totalExams = await Exam.countDocuments();
  console.log(`\n✅ Database now has ${totalCategories} categories and ${totalExams} exams.`);

  await mongoose.disconnect();
  console.log("🔌 Disconnected. Done!");
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});

