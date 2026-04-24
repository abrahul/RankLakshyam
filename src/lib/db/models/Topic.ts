import mongoose, { Schema, Model } from "mongoose";

export interface ITopic {
  _id: string;
  name: { en: string; ml: string };
  icon: string;
  color: string;
  categoryId?: mongoose.Types.ObjectId;
  categoryIds: mongoose.Types.ObjectId[];
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
  categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
  categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
  dailyWeight: { type: Number, default: 2 },
  sortOrder: { type: Number, default: 0 },
  questionCount: { type: Number, default: 0 },
});

TopicSchema.pre("save", function syncPrimaryCategory(next) {
  if ((!this.categoryIds || this.categoryIds.length === 0) && this.categoryId) {
    this.categoryIds = [this.categoryId];
  }
  this.categoryId = this.categoryIds?.[0];
  next();
});

TopicSchema.index({ categoryId: 1 });
TopicSchema.index({ categoryIds: 1 });

const existingModel = mongoose.models.Topic as Model<ITopic> | undefined;
const hasCategoryIdsPath = existingModel?.schema.path("categoryIds");

if (existingModel && !hasCategoryIdsPath) {
  delete mongoose.models.Topic;
}

const Topic: Model<ITopic> =
  (mongoose.models.Topic as Model<ITopic> | undefined) || mongoose.model<ITopic>("Topic", TopicSchema);

export default Topic;
