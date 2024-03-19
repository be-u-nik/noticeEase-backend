import mongoose, { Schema, Document, Types } from "mongoose";

interface IMessage extends Document {
  sender: Types.ObjectId;
  content: string;
  chatId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema<IMessage> = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
  },
  { timestamps: true }
);

const MessageModel = mongoose.model<IMessage>("Message", MessageSchema);
export default MessageModel;
