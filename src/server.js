import app from './app.js';
import connectDB from './config/db.js';
import env from './config/env.js';

// Catch synchronous uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down server...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

let server;

// Connect to MongoDB and start HTTP server
connectDB()
  .then(() => {
    server = app.listen(env.PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 \x1b[32mTaskFlow Server is LIVE\x1b[0m in \x1b[36m${env.NODE_ENV}\x1b[0m mode`);
      console.log(`🌐 \x1b[35mWeb Dashboard:\x1b[0m    http://localhost:${env.PORT}`);
      console.log(`📡 \x1b[34mREST API Health:\x1b[0m  http://localhost:${env.PORT}/health`);
      console.log(`======================================================\n`);
    });
  })
  .catch((err) => {
    console.error('Fatal Database Connection Error during bootstrap:', err.message);
    process.exit(1);
  });

// Catch asynchronous unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down server gracefully...');
  console.error(err.name, err.message, err.stack);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
