import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuestionProgress extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  attempts: number;
  correctAttempts: number;
  wrongAttempts: number;
  lastAttemptedAt: Date;
  isMastered: boolean;
}

const QuestionProgressSchema = new Schema<IQuestionProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    attempts: { type: Number, default: 0 },
    correctAttempts: { type: Number, default: 0 },
    wrongAttempts: { type: Number, default: 0 },
    lastAttemptedAt: { type: Date, default: Date.now },
    isMastered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

QuestionProgressSchema.index({ userId: 1, questionId: 1 }, { unique: true });
QuestionProgressSchema.index({ userId: 1, isMastered: 1, lastAttemptedAt: -1 });

const QuestionProgress: Model<IQuestionProgress> =
  mongoose.models.QuestionProgress ||
  mongoose.model<IQuestionProgress>("QuestionProgress", QuestionProgressSchema);

export default QuestionProgress;

