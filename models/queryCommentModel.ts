import mongoose, { Schema, Document, Types } from "mongoose";

export interface IQueryComment extends Document {
  admin: Types.ObjectId;
  user: Types.ObjectId;
  query: Types.ObjectId;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const QueryCommentSchema: Schema<IQueryComment> = new Schema<IQueryComment>(
  {
    admin: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      validate: {
        validator: function (this: IQueryComment): boolean {
          return !this.user;
        },
        message: "Cannot have both userid and adminid",
      },
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      validate: {
        validator: function (this: IQueryComment): boolean {
          return !this.admin;
        },
        message: "Cannot have both userid and adminid",
      },
    },
    query: { type: Schema.Types.ObjectId, ref: "Query", required: true },
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

const QueryCommentModel = mongoose.model<IQueryComment>(
  "QueryComment",
  QueryCommentSchema
);
export default QueryCommentModel;
