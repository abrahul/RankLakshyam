import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDailyChallenge extends Document {
  _id: mongoose.Types.ObjectId;
  date: string;
  questionIds: mongoose.Types.ObjectId[];
  topicMix: Record<string, number>;
  difficultyLevel: "easy" | "medium" | "hard" | "mixed";
  stats: {
    totalParticipants: number;
    avgScore: number;
    avgTime: number;
    perfectScores: number;
  };
  createdAt: Date;
}

const DailyChallengeSchema = new Schema<IDailyChallenge>({
  date: { type: String, required: true, unique: true },
  questionIds: [{ type: Schema.Types.ObjectId, ref: "Question" }],
  topicMix: { type: Schema.Types.Mixed, default: {} },
  difficultyLevel: {
    type: String,
    enum: ["easy", "medium", "hard", "mixed"],
    default: "medium",
  },
  stats: {
    totalParticipants: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    avgTime: { type: Number, default: 0 },
    perfectScores: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

const DailyChallenge: Model<IDailyChallenge> =
  mongoose.models.DailyChallenge ||
  mongoose.model<IDailyChallenge>("DailyChallenge", DailyChallengeSchema);

export default DailyChallenge;
