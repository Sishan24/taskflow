import mongoose from 'mongoose';
import env from './env.js';

let memServer = null;

/**
 * Establish connection to MongoDB using Mongoose.
 *
 * Resilience feature for local development:
 * If running in 'development' mode and the target database is unreachable
 * (e.g. no local mongod daemon running), it automatically initializes
 * an in-memory MongoDB server using mongodb-memory-server so the developer
 * can test both the REST API and the frontend dashboard immediately with zero configuration!
 */
export async function connectDB() {
  // If explicitly configured for in-memory mode
  if (env.MONGO_URI === 'memory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memServer = await MongoMemoryServer.create();
    const uri = memServer.getUri();
    const conn = await mongoose.connect(uri);
    console.log(`\x1b[32m[TaskFlow]\x1b[0m In-memory MongoDB connected: ${uri}`);
    return conn;
  }

  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: env.NODE_ENV === 'development' ? 2500 : 30000,
    });
    console.log(`\x1b[32m[TaskFlow]\x1b[0m MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    // In development mode, gracefully spin up in-memory MongoDB if local daemon is absent
    if (env.NODE_ENV === 'development') {
      console.warn(
        `\x1b[33m[TaskFlow Notice]\x1b[0m Could not connect to '${env.MONGO_URI}': ${error.message}`
      );
      console.log(
        `\x1b[36m[TaskFlow Notice]\x1b[0m Starting built-in in-memory MongoDB for zero-configuration local hosting...`
      );
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memServer = await MongoMemoryServer.create();
        const uri = memServer.getUri();
        const conn = await mongoose.connect(uri);
        console.log(`\x1b[32m[TaskFlow Ready]\x1b[0m In-memory MongoDB started at: ${uri}`);
        return conn;
      } catch (memErr) {
        console.error('Failed to start in-memory MongoDB fallback:', memErr.message);
        throw error;
      }
    }

    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }
}

export default connectDB;
