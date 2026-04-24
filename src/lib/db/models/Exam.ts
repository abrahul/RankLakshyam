import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExam extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string | null;
  levelId: mongoose.Types.ObjectId;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
  {
    name: { type: String, required: true },
    code: { type: String, default: null, sparse: true },
    levelId: { type: Schema.Types.ObjectId, ref: "Level", required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

ExamSchema.index({ code: 1 });
ExamSchema.index({ levelId: 1 });
ExamSchema.index({ name: 1, levelId: 1 }, { unique: true });

const Exam: Model<IExam> =
  mongoose.models.Exam || mongoose.model<IExam>("Exam", ExamSchema);

export default Exam;
