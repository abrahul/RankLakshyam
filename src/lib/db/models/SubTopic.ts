import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubTopic extends Document {
  _id: mongoose.Types.ObjectId;
  name: { en: string; ml: string };
  topicId: string; // matches Topic._id which is a string
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubTopicSchema = new Schema<ISubTopic>(
  {
    name: {
      en: { type: String, required: true },
      ml: { type: String, default: "" },
    },
    topicId: { type: String, required: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SubTopicSchema.index({ topicId: 1, "name.en": 1 }, { unique: true });

const SubTopic: Model<ISubTopic> =
  mongoose.models.SubTopic ||
  mongoose.model<ISubTopic>("SubTopic", SubTopicSchema);

export default SubTopic;
