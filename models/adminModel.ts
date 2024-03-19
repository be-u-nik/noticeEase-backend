import mongoose, { Schema, Document, Types } from "mongoose";
import bcrypt from "bcrypt";

export interface IAdmin extends Document {
  rollNumber: string;
  email: string;
  phoneNumber: string;
  adminName: string;
  password: string;
  verified: Boolean;
  queryResponses: Types.ObjectId[];
  pic: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema: Schema<IAdmin> = new Schema<IAdmin>(
  {
    rollNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, maxlength: 13, required: true },
    adminName: { type: String, required: true },
    password: {
      type: String,
      required: true,
      validate: {
        validator: (value: string) => {
          // atleast 1 spl char, 1 number, 1 uppercase...
          const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-=_+{};':"\\|,.<>?]).{8,}$/;
          return passwordRegex.test(value);
        },
        message:
          "Password must be at least 8 characters long and contain at least 1 number, 1 special character, 1 capital letter, and 1 lowercase letter",
      },
    },
    verified: { type: Boolean, default: false },
    queryResponses: [{ type: Schema.Types.ObjectId, ref: "QueryResponse" }],
    pic: { type: String },
    // set default pic
  },
  { timestamps: true }
);

AdminSchema.pre<IAdmin>("save", async function (next) {
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

const AdminModel = mongoose.model<IAdmin>("Admin", AdminSchema);
export default AdminModel;
