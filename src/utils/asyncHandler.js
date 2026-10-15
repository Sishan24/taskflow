/**
 * Wraps an asynchronous express route handler/middleware.
 * Catches any unhandled rejection and passes it to the next error-handling middleware.
 * Eliminates repetitive try/catch blocks across controllers.
 *
 * @param {Function} fn - Async express route handler (req, res, next)
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
