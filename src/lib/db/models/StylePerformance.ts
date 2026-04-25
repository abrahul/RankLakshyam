import mongoose, { Schema, Document, Model } from "mongoose";
import { QUESTION_STYLE_VALUES, type QuestionStyle } from "@/lib/question-styles";

export interface IStylePerformance extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  questionStyle: QuestionStyle;
  attempts: number;
  correct: number;
  wrong: number;
  accuracy: number;
  lastAttemptedAt: Date;
}

const StylePerformanceSchema = new Schema<IStylePerformance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    questionStyle: {
      type: String,
      enum: [...QUESTION_STYLE_VALUES],
      required: true,
    },
    attempts: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    lastAttemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

StylePerformanceSchema.index({ userId: 1, questionStyle: 1 }, { unique: true });
StylePerformanceSchema.index({ userId: 1, accuracy: 1, attempts: -1 });

const StylePerformance: Model<IStylePerformance> =
  mongoose.models.StylePerformance ||
  mongoose.model<IStylePerformance>("StylePerformance", StylePerformanceSchema);

export default StylePerformance;

