import mongoose, { Schema, Document, Types } from "mongoose";

interface IQueryResponse extends Document {
  admin: Types.ObjectId;
  response: string;
  queryId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QueryResponsesSchema: Schema<IQueryResponse> = new Schema<IQueryResponse>(
  {
    admin: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    response: { type: String, required: true },
    queryId: { type: Schema.Types.ObjectId, ref: "Query", required: true },
  },
  { timestamps: true }
);

const QueryResponseModel = mongoose.model<IQueryResponse>(
  "QueryResponse",
  QueryResponsesSchema
);
export default QueryResponseModel;
