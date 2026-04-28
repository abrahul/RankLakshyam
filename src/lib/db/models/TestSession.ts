import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITestSession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: "daily" | "topic" | "pyq" | "custom" | "weak_area";
  context: {
    dailyChallengeDate?: string;
    topicId?: string;
    pyqExam?: string;
    pyqYear?: number;
  };
  questionIds: mongoose.Types.ObjectId[];
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  totalTimeSec: number;
  avgTimeSec: number;
  xpEarned: number;
  skippedQuestionIds: mongoose.Types.ObjectId[];
  status: "in_progress" | "completed" | "abandoned";
  currentIndex: number;
  startedAt: Date;
  completedAt?: Date;
}

const TestSessionSchema = new Schema<ITestSession>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["daily", "topic", "pyq", "custom", "weak_area"],
    required: true,
  },
  context: {
    dailyChallengeDate: String,
    topicId: String,
    pyqExam: String,
    pyqYear: Number,
  },
  questionIds: [{ type: Schema.Types.ObjectId, ref: "Question" }],
  totalQuestions: { type: Number, required: true },
  correctCount: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  totalTimeSec: { type: Number, default: 0 },
  avgTimeSec: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  skippedQuestionIds: [{ type: Schema.Types.ObjectId, ref: "Question" }],
  status: {
    type: String,
    enum: ["in_progress", "completed", "abandoned"],
    default: "in_progress",
  },
  currentIndex: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
});

TestSessionSchema.index({ userId: 1, startedAt: -1 });
TestSessionSchema.index({
  userId: 1,
  type: 1,
  "context.dailyChallengeDate": 1,
});
TestSessionSchema.index({ userId: 1, type: 1, status: 1, completedAt: -1 });

const TestSession: Model<ITestSession> =
  mongoose.models.TestSession ||
  mongoose.model<ITestSession>("TestSession", TestSessionSchema);

export default TestSession;
