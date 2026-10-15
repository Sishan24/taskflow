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
      console.log(`TaskFlow Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
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
