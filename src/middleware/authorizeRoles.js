import AppError from '../utils/AppError.js';

/**
 * Role-based authorization middleware.
 * Restricts access to users whose role matches one of the allowed roles.
 *
 * @param  {...string} roles - Permitted roles (e.g. 'admin', 'user')
 * @returns {Function} Express middleware function
 */
export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('Forbidden: You do not have permission to access this resource', 403)
      );
    }
    next();
  };
}

export default authorizeRoles;
