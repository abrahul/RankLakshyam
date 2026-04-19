import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStreak extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string;
  freezesUsedThisWeek: number;
  lastFreezeDate?: string;
  calendar: Map<string, { completed: boolean; score?: number; frozen?: boolean }>;
  updatedAt: Date;
}

const StreakSchema = new Schema<IStreak>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String, default: "" },
    freezesUsedThisWeek: { type: Number, default: 0 },
    lastFreezeDate: String,
    calendar: {
      type: Map,
      of: {
        completed: Boolean,
        score: Number,
        frozen: Boolean,
      },
      default: new Map(),
    },
  },
  { timestamps: true }
);

StreakSchema.index({ userId: 1 }, { unique: true });
StreakSchema.index({ currentStreak: -1 });
StreakSchema.index({ lastCompletedDate: 1 });

const Streak: Model<IStreak> =
  mongoose.models.Streak || mongoose.model<IStreak>("Streak", StreakSchema);

export default Streak;
