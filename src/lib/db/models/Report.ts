import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReport extends Document {
  _id: mongoose.Types.ObjectId;
  type: "question_error" | "wrong_answer" | "explanation_issue" | "app_bug" | "other";
  description: string;
  questionId?: string;
  pageUrl?: string;
  userId?: mongoose.Types.ObjectId;
  status: "open" | "in-progress" | "resolved";
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    type: {
      type: String,
      enum: ["question_error", "wrong_answer", "explanation_issue", "app_bug", "other"],
      required: true,
    },
    description: { type: String, required: true },
    questionId: { type: String },
    pageUrl: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved"],
      default: "open",
    },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

ReportSchema.index({ status: 1 });
ReportSchema.index({ questionId: 1 });
ReportSchema.index({ createdAt: -1 });

const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);

export default Report;
