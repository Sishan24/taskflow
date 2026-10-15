import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Protect middleware
 * 1. Checks for Authorization header starting with 'Bearer '
 * 2. Verifies the JWT signature with JWT_SECRET
 * 3. Verifies that the user still exists in database
 * 4. Attaches the user object to req.user (excluding passwordHash)
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication required. Please provide a Bearer token.', 401));
  }

  // Verify JWT token; errors (JsonWebTokenError, TokenExpiredError) propagate to errorHandler
  const decoded = jwt.verify(token, env.JWT_SECRET);

  // Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // Attach sanitized user document to request
  req.user = currentUser;
  next();
});

export default protect;
