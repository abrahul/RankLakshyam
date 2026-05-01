import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICurrentAffair extends Document {
  _id: mongoose.Types.ObjectId;
  question_en: string;
  question_ml: string;
  answer_en: string;
  answer_ml: string;
  explanation_en: string;
  explanation_ml: string;
  date: Date | null;       // optional — set for daily entries
  month: number;           // 1–12, mandatory
  year: number;            // e.g. 2026, mandatory
  source_batch: string;    // "YYYY-MM-DD-daily" | "YYYY-MM-monthly"
  is_important: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CurrentAffairSchema = new Schema<ICurrentAffair>(
  {
    question_en: { type: String, required: true, trim: true },
    question_ml: { type: String, required: true, trim: true },
    answer_en:   { type: String, required: true, trim: true },
    answer_ml:   { type: String, required: true, trim: true },
    explanation_en: { type: String, default: "", trim: true },
    explanation_ml: { type: String, default: "", trim: true },
    date:         { type: Date, default: null },
    month:        { type: Number, required: true, min: 1, max: 12 },
    year:         { type: Number, required: true },
    source_batch: { type: String, required: true },
    is_important: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Indexes ──
CurrentAffairSchema.index({ date: -1 });
CurrentAffairSchema.index({ month: 1, year: 1 });
CurrentAffairSchema.index({ year: 1, month: 1, date: -1 });

// Partial unique indexes for dedup
// unique(question_en, date) when date is set
CurrentAffairSchema.index(
  { question_en: 1, date: 1 },
  { unique: true, partialFilterExpression: { date: { $type: "date" } } }
);
// unique(question_en, month, year) when date is null
CurrentAffairSchema.index(
  { question_en: 1, month: 1, year: 1 },
  { unique: true, partialFilterExpression: { date: null } }
);

const CurrentAffair: Model<ICurrentAffair> =
  mongoose.models.CurrentAffair ||
  mongoose.model<ICurrentAffair>("CurrentAffair", CurrentAffairSchema);

export default CurrentAffair;
