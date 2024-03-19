import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import asyncHandler from "express-async-handler";
import UserModel, { IUser } from "../models/userModel";
import { IAdmin } from "../models/adminModel";

interface AuthenticatedRequest extends Request {
  user?: IUser;
  admin?: IAdmin;
}

// controller to register user
const registerUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { rollNumber, email, username, password, confirmPassword, reason } = req.body;
  if (!rollNumber || !email || !username || !password || !confirmPassword || !reason) {
    res.status(400).json({ error: "All Fields are necessary" });
    return;
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: "Passwords do not match" });
    return;
  }

  const userExists = await UserModel.findOne({ email }).select("-password");

  if (userExists) {
    res.status(400).json({
      error: "User already exists",
    });
    throw new Error("User already exists");
  }

  try {
    const token = generateToken(email);

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
      from: process.env.EMAIL,
    });

    // Replace with frontend verifyEmail Page
    const frontendLoginURL = `${process.env.FRONTEND_STUDENT_BASE_URL}/verifyEmail?token=${token}`;

    const emailContent = `<p>Please click the following link to verify your email: <a href="${frontendLoginURL}"> Click Here</a></p>`;

    const mailOptions = {
      from: "Admin",
      to: email,
      subject: "Student Email Confirmation",
      text: emailContent,
      html: emailContent,
    };

    const user = await UserModel.create({
      rollNumber,
      username,
      email,
      password,
      reason,
    });
    if (user) {
      await transporter.sendMail(mailOptions).catch((e) => {
        // console.log(e, "...");
      });
      res.status(200).json({
        message: "Please check your email for confirmation.",
      });
    } else {
      res.status(500).json({ error: "Failed to register user" });
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to register user, Verification email not sent",
    });
  }
});

const validateToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const token = req.params.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      email: string;
    };
    const user = await UserModel.findOne({ email: decoded.email }).select("-password");

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    user.emailVerified = true;

    await user.save();

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
      from: process.env.EMAIL,
    });

    // const randomlyChosenEmails: string[] = getRandomStrings(
    //   process.env.ADMIN_EMAILS.split(","),
    //   1
    // );
    const randomlyChosenEmails: string[] = process.env.ADMIN_EMAILS.split(",");

    // Replace with frontend frontendAdminPage Page
    const frontendAdminPage = `${process.env.FRONTEND_ADMIN_BASE_URL}/unverifiedStudents`;

    const emailContent = `<p>You have recieved a new registartion request, to view click: <a href="${frontendAdminPage}"> Click Here</a></p>`;

    // send emails to any three admins
    for (var i = 0; i < randomlyChosenEmails.length; i++) {
      const mailToAdminOptions = {
        from: user.email,
        to: randomlyChosenEmails[i],
        subject: "Request to access notices app",
        text: emailContent,
        html: emailContent,
        // change it to a frontend Verify User page
      };
      await transporter.sendMail(mailToAdminOptions).catch((e) => {
        // console.log(e, "...");
      });
    }

    // const mailToUserOptions = {
    //   from: "Admin",
    //   to: user.email,
    //   subject: "Registration request recieved!",
    //   text: "Your registration request has been recieved, You will recieve an email as soon as the admin approves your registration",
    //   // change it to a frontend page
    // };

    // await transporter.sendMail(mailToUserOptions).catch((e) => {
    //   // console.log(e, "...");
    // });

    res.status(200).json({
      message: "Email verified successfully"
      // user,
    });
  } catch (error) {
    res.status(400).json({ error: "Invalid or expired token" });
  }
});

const loginUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "All Fields are necessary" });
    return;
  }

  try {
    const user = await UserModel.findOne({ email });

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password).catch((e) => {
      //   console.log(e);
    });

    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (!user.emailVerified) {
      res.status(401).json({ error: "Email uverified! Please check your mail" });
      return;
    }

    if (!user.verified) {
      res.status(401).json({ error: "Please wait untill the admin grants you access" });
      return;
    }

    const authToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "100d",
    });

    res.status(200).json({
      authToken
      // user,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to login" });
  }
});

const getAllVerifiedUsers = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = parseInt(req.query.skip as string) || 0;

    // Fetch verified users and populate the verifiedBy field with admin details
    const verifiedUsers = await UserModel.find({ verified: true })
      .select("-password -emailVerified -queries -updatedAt -__v")
      .populate({
        path: "verifiedBy",
        select: "rollNumber adminName", // select the fields you want to include from the AdminModel
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    res.json(verifiedUsers);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllUnverifiedUsers = asyncHandler(async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find({ verified: false, emailVerified: true })
      .select("-password -queries -updatedAt -__v -emailVerified")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const getUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId || undefined;
    if (userId) {
      const user = await UserModel.findById(userId).select("-password");
      if (!user) {
        res.status(404).json({ error: "user not found" });
      }
      res.status(200).json({ user });
    } else {
      if (req.user) res.status(200).json({ user: req.user });
      else res.status(404).json({ error: "user not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user" });
  }
};

const searchUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { query } = req.query;

  try {
    const users = await UserModel.find({
      $or: [{ username: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }],
    })
      .find({ _id: { $ne: req.user?._id } })
      .select("-password");

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ error: "Failed to search users" });
  }
};

const generateToken = (email: string) => {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "365d" });
};

const getRandomStrings = (list: string[], count: number) => {
  const randomStrings: string[] = [];
  const maxIndex = list.length;

  while (randomStrings.length < count) {
    const randomIndex = Math.floor(Math.random() * maxIndex);
    const randomString = list[randomIndex];

    if (!randomStrings.includes(randomString)) {
      randomStrings.push(randomString);
    }
  }

  return randomStrings;
};

export default {
  registerUser,
  validateToken,
  loginUser,
  getUser,
  searchUsers,
  getAllVerifiedUsers,
  getAllUnverifiedUsers,
};
