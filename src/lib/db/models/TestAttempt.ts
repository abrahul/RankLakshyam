import mongoose, { Schema, Document, Model } from "mongoose";

export type AttemptOption = "A" | "B" | "C" | "D" | null;

export interface ITestAttemptQuestion {
  questionId: mongoose.Types.ObjectId;
  selectedOption: AttemptOption;
  correctOption: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  timeTakenSec: number;
  status: "answered" | "skipped" | "unattempted";
}

export interface ITestAttempt extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  testSessionId: mongoose.Types.ObjectId;
  testId: string;
  questions: ITestAttemptQuestion[];
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  skippedCount: number;
  score: number;
  accuracy: number;
  startedAt: Date;
  completedAt: Date;
  durationSec: number;
  createdAt: Date;
}

const TestAttemptQuestionSchema = new Schema<ITestAttemptQuestion>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    selectedOption: { type: String, enum: ["A", "B", "C", "D", null], default: null },
    correctOption: { type: String, enum: ["A", "B", "C", "D"], required: true },
    isCorrect: { type: Boolean, required: true },
    timeTakenSec: { type: Number, default: 0 },
    status: { type: String, enum: ["answered", "skipped", "unattempted"], default: "answered" },
  },
  { _id: false }
);

const TestAttemptSchema = new Schema<ITestAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    testSessionId: { type: Schema.Types.ObjectId, ref: "TestSession", required: true, unique: true },
    testId: { type: String, default: "" },
    questions: { type: [TestAttemptQuestionSchema], default: [] },
    totalQuestions: { type: Number, required: true },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unattemptedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
    durationSec: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

TestAttemptSchema.index({ userId: 1, completedAt: -1 });
TestAttemptSchema.index({ userId: 1, startedAt: -1 });

const TestAttempt: Model<ITestAttempt> =
  mongoose.models.TestAttempt ||
  mongoose.model<ITestAttempt>("TestAttempt", TestAttemptSchema);

export default TestAttempt;
