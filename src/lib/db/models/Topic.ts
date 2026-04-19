import mongoose, { Schema, Model } from "mongoose";

export interface ITopic {
  _id: string;
  name: { en: string; ml: string };
  icon: string;
  color: string;
  subTopics: Array<{ id: string; name: { en: string; ml: string } }>;
  dailyWeight: number;
  examTags: Array<"ldc" | "lgs" | "degree" | "police">;
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
  subTopics: [
    {
      id: String,
      name: {
        en: String,
        ml: String,
      },
    },
  ],
  dailyWeight: { type: Number, default: 2 },
  examTags: [{ type: String, enum: ["ldc", "lgs", "degree", "police"] }],
  sortOrder: { type: Number, default: 0 },
  questionCount: { type: Number, default: 0 },
});

const Topic: Model<ITopic> =
  mongoose.models.Topic || mongoose.model<ITopic>("Topic", TopicSchema);

export default Topic;
