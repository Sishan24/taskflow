import AppError from '../utils/AppError.js';

/**
 * Catch-all middleware for unknown routes.
 * Creates an operational 404 AppError and forwards it to the centralized error handler.
 */
export function notFound(req, res, next) {
  next(new AppError('Route not found', 404));
}

export default notFound;
