import mongoose from 'mongoose';

let connection;

const resolveUri = () => {
  return process.env.DB_URI || 'mongodb://localhost:27017/constructops';
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
