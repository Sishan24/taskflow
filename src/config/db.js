import mongoose from 'mongoose';
import env from './env.js';

/**
 * Establish connection to MongoDB using Mongoose.
 * Logs success message on connection.
 * Throws an error on failure so caller (server.js) can handle fatal startup errors.
 */
export async function connectDB() {
  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }
}

export default connectDB;
