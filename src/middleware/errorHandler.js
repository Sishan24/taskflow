import env from '../config/env.js';

/**
 * Global Express error-handling middleware.
 * Normalizes different error types (Mongoose, Zod, JWT, JSON syntax, AppError)
 * into a consistent JSON response: { success: false, message: '...' }.
 *
 * @param {Error} err - Error object
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // 1. Mongoose Validation Error
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }
  // 2. Mongoose Cast Error (e.g., invalid ObjectId)
  else if (err.name === 'CastError' || err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Invalid ID format';
  }
  // 3. Mongoose Duplicate Key Error (E11000)
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || 'field';
    message = `Duplicate value entered for ${field} field`;
  }
  // 4. Zod Validation Error
  else if (err.name === 'ZodError' || Array.isArray(err.issues)) {
    statusCode = 400;
    message = err.issues
      .map((issue) => {
        const path = issue.path && issue.path.length ? `${issue.path.join('.')}: ` : '';
        return `${path}${issue.message}`;
      })
      .join(', ');
  }
  // 5. JWT Invalid Token Error
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  // 6. JWT Token Expired Error
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  // 7. Malformed JSON Body Syntax Error
  else if (err instanceof SyntaxError && (err.status === 400 || 'body' in err)) {
    statusCode = 400;
    message = 'Malformed JSON body';
  }
  // 8. Operational AppError
  else if (err.isOperational) {
    statusCode = err.statusCode || 400;
    message = err.message;
  }
  // 9. Unhandled / Programmer Error
  else {
    statusCode = 500;
    if (env.NODE_ENV === 'production') {
      message = 'Internal server error';
    } else {
      message = err.message || 'Internal server error';
    }
  }

  const response = {
    success: false,
    message,
  };

  // Include stack trace in development mode for debugging
  if (env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

export default errorHandler;
