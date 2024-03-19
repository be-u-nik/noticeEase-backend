import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    // const dbUri = process.env.MONGO_URI;
    const dbUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}`;

    const conn = await mongoose.connect(dbUri);
    console.log(
      `MongoDB Connected: ${conn.connection.host}: ${conn.connection.port}, DB: ${conn.connection.db.databaseName}`
    );
  } catch (error: any) {
    console.log(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
