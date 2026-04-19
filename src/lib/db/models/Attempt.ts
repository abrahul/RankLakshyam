import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttempt extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  selectedOption: "A" | "B" | "C" | "D";
  correctOption: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  timeTakenSec: number;
  topicId: string;
  difficulty: number;
  sessionType: string;
  createdAt: Date;
}

const AttemptSchema = new Schema<IAttempt>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: "TestSession",
    required: true,
  },
  questionId: {
    type: Schema.Types.ObjectId,
    ref: "Question",
    required: true,
  },
  selectedOption: {
    type: String,
    enum: ["A", "B", "C", "D"],
    required: true,
  },
  correctOption: {
    type: String,
    enum: ["A", "B", "C", "D"],
    required: true,
  },
  isCorrect: { type: Boolean, required: true },
  timeTakenSec: { type: Number, required: true },
  topicId: { type: String, required: true },
  difficulty: { type: Number, default: 2 },
  sessionType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

AttemptSchema.index({ userId: 1, topicId: 1, createdAt: -1 });
AttemptSchema.index({ sessionId: 1, createdAt: 1 });
AttemptSchema.index({ questionId: 1, isCorrect: 1 });
AttemptSchema.index({ userId: 1, createdAt: -1 });
AttemptSchema.index({ createdAt: 1 });

const Attempt: Model<IAttempt> =
  mongoose.models.Attempt ||
  mongoose.model<IAttempt>("Attempt", AttemptSchema);

export default Attempt;
