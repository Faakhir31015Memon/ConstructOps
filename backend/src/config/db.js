import mongoose from 'mongoose';

let connection;

const resolveUri = () => {
  if (process.env.DB_URI) return process.env.DB_URI;
  if (process.env.VERCEL) {
    throw new Error('DB_URI is not set. Add it under Vercel Project Settings → Environment Variables.');
  }
  return 'mongodb://localhost:27017/constructops';
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1 && connection) return connection;

  connection = await mongoose.connect(resolveUri(), {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });
  return connection;
};

export default connectDB;
