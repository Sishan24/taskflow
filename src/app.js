import cors from 'cors';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import env from './config/env.js';
import errorHandler from './middleware/errorHandler.js';
import logger from './middleware/logger.js';
import notFound from './middleware/notFound.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

// Trust reverse proxy (needed for Render, Heroku, etc. when determining client IP)
app.set('trust proxy', 1);

// Security HTTP headers (configured to allow local frontend assets)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Cross-Origin Resource Sharing
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev/test, can be restricted if needed
    },
    credentials: true,
  })
);

// Global Rate Limiting across all requests
app.use(globalLimiter);

// Body Parsers with payload size limits to mitigate large payload DoS attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// NoSQL Injection Sanitization: strips prohibited '$' and '.' characters from body/params/query
// Must execute AFTER body parsers and BEFORE application routes
app.use(mongoSanitize());

// HTTP Request Logger
app.use(logger);

// Serve static frontend assets from public directory
app.use(express.static('public'));

// Health check endpoint for uptime monitors and load balancers
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
    },
  });
});

// Mount modular API routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// Catch-all 404 handler for unmatched routes
app.use(notFound);

// Centralized global error handling middleware
app.use(errorHandler);

export default app;
