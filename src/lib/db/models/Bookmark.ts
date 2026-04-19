import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBookmark extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  source: "manual" | "wrong_answer";
  note?: string;
  createdAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  questionId: {
    type: Schema.Types.ObjectId,
    ref: "Question",
    required: true,
  },
  source: {
    type: String,
    enum: ["manual", "wrong_answer"],
    default: "manual",
  },
  note: String,
  createdAt: { type: Date, default: Date.now },
});

BookmarkSchema.index({ userId: 1, createdAt: -1 });
BookmarkSchema.index({ userId: 1, questionId: 1 }, { unique: true });

const Bookmark: Model<IBookmark> =
  mongoose.models.Bookmark ||
  mongoose.model<IBookmark>("Bookmark", BookmarkSchema);

export default Bookmark;
