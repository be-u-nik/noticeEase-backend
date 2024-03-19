import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import AdminModel, { IAdmin } from "../models/adminModel";
import UserModel, { IUser } from "../models/userModel";

interface AuthenticatedRequest extends Request {
  admin?: IAdmin;
  user?: IUser;
}

const searchController = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const query = req.query.query;

      const users = await UserModel.find({
        $or: [
          { username: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
          { rollNumber: { $regex: query, $options: "i" } },
        ],
      })
        .find({ _id: { $ne: req.user?._id } })
        .select("-password");

      const admins = await AdminModel.find({
        $or: [
          { adminName: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
          { rollNumber: { $regex: query, $options: "i" } },
        ],
      })
        .find({ _id: { $ne: req.admin?._id } })
        .select("-password");

      res.json({ admins, users });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default { searchController };
