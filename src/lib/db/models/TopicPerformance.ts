import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITopicPerformance extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  topicId: string;
  attempts: number;
  correct: number;
  wrong: number;
  accuracy: number;
  lastAttemptedAt: Date;
}

const TopicPerformanceSchema = new Schema<ITopicPerformance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    topicId: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    lastAttemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

TopicPerformanceSchema.index({ userId: 1, topicId: 1 }, { unique: true });
TopicPerformanceSchema.index({ userId: 1, accuracy: 1, attempts: -1 });

const TopicPerformance: Model<ITopicPerformance> =
  mongoose.models.TopicPerformance ||
  mongoose.model<ITopicPerformance>("TopicPerformance", TopicPerformanceSchema);

export default TopicPerformance;

