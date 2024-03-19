import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import UserModel, { IUser } from "../models/userModel";

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

const userAuthMiddleware = async (
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

    const user = await UserModel.findOne({ email: decoded.email }).select(
      "-password"
    );
    // console.log(decoded);
    if (!user) {
      res.status(401).json({ error: "User does not exist, so Unauthorised" });
      return;
    }

    req.user = user;

    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

export default userAuthMiddleware;
