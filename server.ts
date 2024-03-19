import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import connectDB from "./config/db";
import userRouter from "./routes/userRoutes";
import adminRouter from "./routes/adminRoutes";
import queryRouter from "./routes/queryRoutes";
import cors from "cors";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 8000;

app.get("/", (req: Request, res: Response) => {
  res.send("Backend for a cdc-app online");
});

app.use(cors<Request>());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/api/users", userRouter);
app.use("/api/admins", adminRouter);
app.use("/api/queries", queryRouter);

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`⚡️[server]: The Server is running at http://localhost:${port}`);
  });
});
