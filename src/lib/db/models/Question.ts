import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuestion extends Document {
  _id: mongoose.Types.ObjectId;
  text: { en: string; ml: string };
  options: Array<{ key: "A" | "B" | "C" | "D"; en: string; ml: string }>;
  answer: "A" | "B" | "C" | "D";
  // Back-compat for existing UI/routes while migrating
  correctOption?: "A" | "B" | "C" | "D";
  explanation: { en: string; ml: string };
  optionWhy?: Record<"A" | "B" | "C" | "D", { en: string; ml: string }>;
  categoryId: mongoose.Types.ObjectId;
  topicId: string;
  subtopicId?: mongoose.Types.ObjectId;
  // Back-compat alias (legacy name)
  subTopic?: mongoose.Types.ObjectId;
  examTags: mongoose.Types.ObjectId[];
  tags: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  language: "en" | "ml" | "mixed";
  questionStyle: "direct" | "concept" | "statement" | "negative" | "indirect";

  pyq?: { exam: string; year: number; questionNumber: number };
  sourceType?: "pyq" | "pyq_variant" | "institute" | "internet";
  sourceRef?: string;
  parentQuestionId?: mongoose.Types.ObjectId;
  status: "review" | "approved" | "rejected";
  createdByLabel?: "ai";
  isVerified: boolean;
  totalAttempts: number;
  correctRate: number;
  avgTimeTaken: number;
  reportCount: number;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    text: {
      en: { type: String, required: true },
      ml: { type: String, default: "" },
    },
    options: [
      {
        key: { type: String, enum: ["A", "B", "C", "D"], required: true },
        en: { type: String, required: true },
        ml: { type: String, default: "" },
      },
    ],
    answer: {
      type: String,
      enum: ["A", "B", "C", "D"],
      required: true,
      alias: "correctOption",
    },
    explanation: {
      en: { type: String, default: "" },
      ml: { type: String, default: "" },
    },
    optionWhy: {
      A: {
        en: { type: String, default: "" },
        ml: { type: String, default: "" },
      },
      B: {
        en: { type: String, default: "" },
        ml: { type: String, default: "" },
      },
      C: {
        en: { type: String, default: "" },
        ml: { type: String, default: "" },
      },
      D: {
        en: { type: String, default: "" },
        ml: { type: String, default: "" },
      },
    },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    topicId: { type: String, required: true },
    subtopicId: { type: Schema.Types.ObjectId, ref: "SubTopic", default: null, alias: "subTopic" },
    examTags: [{ type: Schema.Types.ObjectId, ref: "Exam" }],
    tags: [String],
    difficulty: { type: Number, min: 1, max: 5, default: 2 },
    language: { type: String, enum: ["en", "ml", "mixed"], default: "en" },
    questionStyle: {
      type: String,
      enum: ["direct", "concept", "statement", "negative", "indirect"],
      default: "direct",
    },

    pyq: {
      exam: String,
      year: Number,
      questionNumber: Number,
    },
    sourceType: {
      type: String,
      enum: ["pyq", "pyq_variant", "institute", "internet"],
    },
    sourceRef: { type: String, default: "" },
    parentQuestionId: { type: Schema.Types.ObjectId, ref: "Question" },
    status: {
      type: String,
      enum: ["review", "approved", "rejected"],
      default: "review",
    },
    createdByLabel: { type: String, enum: ["ai"] },
    isVerified: { type: Boolean, default: false },
    totalAttempts: { type: Number, default: 0 },
    correctRate: { type: Number, default: 0 },
    avgTimeTaken: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// ── Indexes ──
QuestionSchema.index({ categoryId: 1, topicId: 1, difficulty: 1, isVerified: 1 });
QuestionSchema.index({ categoryId: 1, topicId: 1, subtopicId: 1, difficulty: 1 });
QuestionSchema.index({ categoryId: 1, topicId: 1, questionStyle: 1, difficulty: 1 });
QuestionSchema.index({ status: 1, createdAt: -1 });
QuestionSchema.index({ sourceType: 1, parentQuestionId: 1 });
QuestionSchema.index({ "pyq.exam": 1, "pyq.year": -1, "pyq.questionNumber": 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ isVerified: 1, createdAt: -1 });
QuestionSchema.index({ "text.en": "text", "text.ml": "text" });

QuestionSchema.index({ examTags: 1 });
QuestionSchema.index({ categoryId: 1, examTags: 1 });

const Question: Model<IQuestion> =
  mongoose.models.Question ||
  mongoose.model<IQuestion>("Question", QuestionSchema);

export default Question;
