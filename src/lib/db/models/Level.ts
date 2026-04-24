import mongoose, { Schema, Document, Model } from "mongoose";

export const LEVEL_NAMES = ["10th_level", "plus2_level", "degree_level", "other_exams"] as const;
export type LevelName = (typeof LEVEL_NAMES)[number];

export interface ILevel extends Document {
  _id: mongoose.Types.ObjectId;
  name: LevelName;
  displayName: { en: string; ml: string };
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const LevelSchema = new Schema<ILevel>(
  {
    name: {
      type: String,
      enum: LEVEL_NAMES,
      required: true,
      unique: true,
    },
    displayName: {
      en: { type: String, required: true },
      ml: { type: String, default: "" },
    },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Level: Model<ILevel> =
  mongoose.models.Level || mongoose.model<ILevel>("Level", LevelSchema);

export default Level;
