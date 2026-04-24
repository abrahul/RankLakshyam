import mongoose, { Schema, Model } from "mongoose";

export interface ITopic {
  _id: string;
  name: { en: string; ml: string };
  icon: string;
  color: string;
  levelId?: mongoose.Types.ObjectId;
  dailyWeight: number;
  sortOrder: number;
  questionCount: number;
}

const TopicSchema = new Schema<ITopic>({
  _id: { type: String },
  name: {
    en: { type: String, required: true },
    ml: { type: String, default: "" },
  },
  icon: { type: String, default: "📚" },
  color: { type: String, default: "#6366f1" },
  levelId: { type: Schema.Types.ObjectId, ref: "Level" },
  dailyWeight: { type: Number, default: 2 },
  sortOrder: { type: Number, default: 0 },
  questionCount: { type: Number, default: 0 },
});

TopicSchema.index({ levelId: 1 });

const Topic: Model<ITopic> =
  mongoose.models.Topic || mongoose.model<ITopic>("Topic", TopicSchema);

export default Topic;
