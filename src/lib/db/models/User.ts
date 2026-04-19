import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  image?: string;
  phone?: string;
  role: "user" | "admin";
  targetExam: "ldc" | "lgs" | "degree" | "police";
  languagePref: "en" | "ml" | "both";
  reminderTime: string;
  stats: {
    totalAttempted: number;
    totalCorrect: number;
    accuracy: number;
    avgTimePerQuestion: number;
    totalXP: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string;
    topicAccuracy: Map<
      string,
      { attempted: number; correct: number; accuracy: number }
    >;
  };
  badges: Array<{ id: string; earnedAt: Date }>;
  fcmToken?: string;
  onboarded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: String,
    phone: String,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    targetExam: {
      type: String,
      enum: ["ldc", "lgs", "degree", "police"],
      default: "ldc",
    },
    languagePref: {
      type: String,
      enum: ["en", "ml", "both"],
      default: "both",
    },
    reminderTime: { type: String, default: "07:00" },
    stats: {
      totalAttempted: { type: Number, default: 0 },
      totalCorrect: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
      avgTimePerQuestion: { type: Number, default: 0 },
      totalXP: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      lastActiveDate: { type: String, default: "" },
      topicAccuracy: {
        type: Map,
        of: {
          attempted: Number,
          correct: Number,
          accuracy: Number,
        },
        default: new Map(),
      },
    },
    badges: [
      {
        id: String,
        earnedAt: Date,
      },
    ],
    fcmToken: String,
    onboarded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ "stats.totalXP": -1 });
UserSchema.index({ role: 1, createdAt: -1 });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
