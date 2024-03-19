import mongoose, { Schema, Document, Types } from "mongoose";

interface IChat extends Document {
  chatname: string;
  users: string[];
  latestMsg: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema: Schema<IChat> = new Schema<IChat>(
  {
    chatname: { type: String, required: true },
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        validate: (val: string[]) => val.length <= 2,
      },
    ],
    latestMsg: { type: Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

const ChatModel = mongoose.model<IChat>("Chat", ChatSchema);
export default ChatModel;
