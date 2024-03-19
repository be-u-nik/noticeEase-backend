import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import AdminModel, { IAdmin } from "../models/adminModel";

interface AuthenticatedRequest extends Request {
  admin?: IAdmin;
}

const adminAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      email: string;
    };

    const admin = await AdminModel.findOne({ email: decoded.email }).select(
      "-password"
    );
    // console.log(decoded);
    if (!admin) {
      res.status(401).json({ error: "Admin does not exist, so Unauthorised" });
      return;
    }

    req.admin = admin;

    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

export default adminAuthMiddleware;
