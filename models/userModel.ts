import mongoose, { Schema, Document, Types } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  rollNumber: string;
  email: string;
  phoneNumber?: string;
  username: string;
  password: string;
  reason?: string;
  emailVerified: Boolean;
  verified: Boolean;
  verifiedBy: Types.ObjectId;
  queries: Types.ObjectId[];
  pic: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema<IUser>(
  {
    rollNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, maxlength: 10 },
    reason: { type: String },
    username: { type: String, required: true },
    password: {
      type: String,
      required: true,
      validate: {
        validator: (value: string) => {
          // atleast 1 spl char, 1 number, 1 uppercase...
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-=_+{};':"\\|,.<>?]).{8,}$/;
          return passwordRegex.test(value);
        },
        message:
          "Password must be at least 8 characters long and contain at least 1 number, 1 special character, 1 capital letter, and 1 lowercase letter",
      },
    },
    verified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    queries: [{ type: Schema.Types.ObjectId, ref: "Query" }],
    pic: { type: String },
  },
  { timestamps: true }
);

UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
    return next();
  } catch (error: any) {
    return next(error);
  }
});

const UserModel = mongoose.model<IUser>("User", UserSchema);
export default UserModel;
