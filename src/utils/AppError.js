/**
 * AppError represents an operational error that can be predicted and handled gracefully.
 * Examples include validation failures, unauthorized access, and resource not found.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (e.g., 400, 401, 403, 404, 409, 500)
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    // Marks error as operational so the global error handler distinguishes it from unexpected bugs
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
