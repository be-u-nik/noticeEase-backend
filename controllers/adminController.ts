import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import asyncHandler from "express-async-handler";
import AdminModel, { IAdmin } from "../models/adminModel";
import UserModel, { IUser } from "../models/userModel";

interface AuthenticatedRequest extends Request {
  admin?: IAdmin;
  user?: IUser;
}

const registerAdmin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { rollNumber, email, phoneNumber, adminName, password, confirmPassword } = req.body;
  if (!rollNumber || !email || !phoneNumber || !adminName || !password || !confirmPassword) {
    res.status(400).json({ error: "All Fields are necessary" });
    return;
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: "Passwords do not match" });
    return;
  }

  const adminExists = await AdminModel.findOne({ email }).select("-password");

  if (adminExists) {
    res.status(400).json({ error: "Admin already exists" });
    throw new Error("Admin already exists");
  }

  if (!process.env.ADMIN_LIST.split(",").includes(rollNumber)) {
    res.status(400).json({ error: "Invalid Roll Number" });
    throw new Error("Invalid Roll Number");
  }

  try {
    const token = generateToken(email);

    const admin = await AdminModel.create({
      rollNumber,
      adminName,
      email,
      password,
      phoneNumber,
    });
    if (admin) {
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASSWORD,
        },
        from: process.env.EMAIL,
      });

      const frontendVerifyURL = `${process.env.FRONTEND_ADMIN_BASE_URL}/verifyEmail?token=${token}`;

      const emailContent = `<p>Please click the following link to verify your email: <a href="${frontendVerifyURL}"> Verify Email</a></p>`;

      const mailToAdminOptions = {
        from: "Nikhil M",
        to: email,
        subject: "Admin Email Confirmation",
        text: emailContent,
        html: emailContent,
      };

      await transporter.sendMail(mailToAdminOptions).catch((e) => {
        // console.log(e, "...");
      });

      res.status(200).json({
        message: "Admin registered successfully. Please check your email for confirmation.",
        // token,
      });
    } else {
      res.status(500).json({ error: "Failed to register admin" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Failed to register admin, Verification email not sent",
    });
  }
});

const validateToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const token = req.params.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      email: string;
    };
    const admin = await AdminModel.findOne({ email: decoded.email }).select("-password");

    if (!admin) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }

    admin.verified = true;
    await admin.save();

    // const transporter = nodemailer.createTransport({
    //   service: "Gmail",
    //   auth: {
    //     user: process.env.EMAIL,
    //     pass: process.env.EMAIL_PASSWORD,
    //   },
    // });

    // Replace with frontend Login Page
    // const frontendLoginURL = ` ${req.protocol}://${req.get(
    //   "host"
    // )}/api/admins/validate/${token}`;

    // const emailContent = `<p>Email verified successfully, login: <a href="${frontendLoginURL}"> Login</a></p>`;

    // const mailToAdminOptions = {
    //   from: "Nikhil",
    //   to: admin.email,
    //   subject: "Admin Email Confirmation",
    //   html: emailContent,
    //   // change it to a frontend page
    // };

    // await transporter.sendMail(mailToAdminOptions).catch((e) => {
    //   // console.log(e, "...");
    // });

    res.status(200).json({
      message: "Admin Email verified successfully",
      // admin,
    });
  } catch (error) {
    res.status(400).json({ error: "Invalid or expired token" });
  }
});

const loginAdmin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "All Fields are necessary" });
    return;
  }

  try {
    const admin = await AdminModel.findOne({ email });

    if (!admin) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password).catch((e) => {
      //   console.log(e);
    });

    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (admin.verified == false) {
      res.status(401).json({ error: "admin not Verified" });
      return;
    }

    const authToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "100d",
    });

    res.status(200).json({
      authToken,
      // admin,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to login as Admin" });
  }
});

const getAdmin = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.query.adminId || undefined;
    if (adminId) {
      const admin = await AdminModel.findById(adminId).select("-password");
      if (!admin) {
        res.status(404).json({ error: "admin not found" });
      }
      res.status(200).json({ admin });
    } else {
      if (req.admin) res.status(200).json({ admin: req.admin });
      else res.status(404).json({ error: "Admin not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve admin" });
  }
});

const searchAdmins = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { query } = req.query;

  try {
    const admins = await AdminModel.find({
      $or: [{ adminName: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }],
    })
      .find({ _id: { $ne: req.admin?._id } })
      .select("-password");

    res.status(200).json({ admins });
  } catch (error) {
    res.status(500).json({ error: "Failed to search admin" });
  }
};

const verifyUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rollNumber } = req.body;

    const user = await UserModel.findOne({
      rollNumber,
    }).select("-password");
    const admin = req.admin;

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (!admin) {
      res.status(404).json({ error: "Admin doesnot exist" });
      return;
    }

    if (admin.verified != true) {
      res.status(403).json({ error: "Admin not verified" });
      return;
    }

    if (user.verified == true) {
      const verifiedBy = await AdminModel.findById(user.verifiedBy).select("-password");
      res.status(409).json({
        message: `Student already verified by ${verifiedBy?.adminName} (${verifiedBy?.rollNumber})`,
      });
      return;
    }

    user.verified = true;
    user.verifiedBy = admin._id;
    user.reason = undefined;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
      from: process.env.EMAIL,
    });

    const frontendUserLoginURL = `${process.env.FRONTEND_STUDENT_BASE_URL}/login`;

    const emailContent = `<p>You have been approved to use the app</p> <p> You can use <a href="${frontendUserLoginURL}">This Link</a> to login</p>`;

    const mailToUserOptions = {
      from: admin.email,
      to: user.email,
      subject: "App access approved",
      text: emailContent,
      html: emailContent,
    };

    await transporter.sendMail(mailToUserOptions).catch((e) => {
      // console.log(e, "...");
    });

    res.status(200).json({
      message: "User has been approved by the admin",
      // user,
    });
  } catch (error) {
    res.status(400).json({ error: "Invalid or expired token" });
  }
});

const sendUserRegisterFeedback = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { feedback, rollNumber } = req.body;

    const user = await UserModel.findOne({
      rollNumber,
    }).select("-password");
    const admin = req.admin;

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (!admin) {
      res.status(404).json({ error: "Admin does not exist" });
      return;
    }

    if (admin.verified != true) {
      res.status(403).json({ error: "Admin not verified" });
      return;
    }

    if (user.verified == true) {
      const verifiedBy = await AdminModel.findById(user.verifiedBy).select("-password");
      res.status(409).json({
        message: `Student already verified by ${verifiedBy?.adminName} (${verifiedBy?.rollNumber})`,
      });
      return;
    } else {
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASSWORD,
        },
        from: process.env.EMAIL,
      });

      const frontendUserRegisterURL = `${process.env.FRONTEND_STUDENT_BASE_URL}/register`;

      const emailContent = `<p>You have been <strong>not</strong> been approved to use the app</p><p>Feedback from the admin:</p><p>${feedback}</p> <p> You can use <a href="${frontendUserRegisterURL}">This Link</a> to Register again</p> <p>For any queries contact: ${admin.adminName}, email:${admin.email}, phoneNumber:${admin.phoneNumber}</p>`;

      const mailToUserOptions = {
        from: admin.email,
        to: user.email,
        subject: "App access denied",
        text: emailContent,
        html: emailContent,
      };

      await transporter.sendMail(mailToUserOptions).catch((e) => {
        // console.log(e, "...");
      });

      await UserModel.deleteOne({
        rollNumber,
      });

      res.status(200).json({
        message: "Feedback sent to the user",
        // user,
      });
    }
  } catch (error) {
    res.status(400).json({ error: "Invalid or expired token" });
  }
});

const generateToken = (email: string) => {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

export default {
  registerAdmin,
  validateToken,
  loginAdmin,
  getAdmin,
  searchAdmins,
  verifyUser,
  sendUserRegisterFeedback,
};
