import mongoose, { Schema, Document, Types } from "mongoose";

interface ICounter extends Document {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 1 },
});

const Counter = mongoose.model<ICounter>("Counter", counterSchema);

export interface IQuery extends Document {
  queryNumber: number;
  queryBy: Types.ObjectId;
  queryTitle: string;
  query: string;
  votes: number;
  votedBy: Types.ObjectId[];
  isResolved: boolean;
  queryResponse?: Types.ObjectId;
  queryComments: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const QuerySchema: Schema<IQuery> = new Schema<IQuery>(
  {
    queryNumber: { type: Number, unique: true },
    queryBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    queryTitle: { type: String, required: true },
    query: { type: String, required: true },
    votes: { type: Number, default: 0 },
    votedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isResolved: { type: Boolean, default: false },
    queryResponse: { type: Schema.Types.ObjectId, ref: "QueryResponse" },
    queryComments: [{ type: Schema.Types.ObjectId, ref: "QueryComment" }],
  },
  { timestamps: true }
);

QuerySchema.pre<IQuery>("save", async function (next) {
  if (!this.isNew) {
    return next();
  }
  try {
    const counter = await Counter.findByIdAndUpdate(
      { _id: "queryNumber" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    ).lean();

    this.queryNumber = counter.seq;
    next();
  } catch (error: any) {
    next(error);
  }
});

const QueryModel = mongoose.model<IQuery>("Query", QuerySchema);
export default QueryModel;
