import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Sign a JSON Web Token for authenticated sessions.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} role
 * @returns {string} Signed JWT
 */
export function signToken(userId, role) {
  return jwt.sign({ id: userId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/**
 * Register a new user.
 * Hashes the plain-text password using bcrypt and generates a JWT.
 */
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  // Salt and hash the password
  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(password, salt);

  // Save the new user record
  const user = await User.create({
    name,
    email,
    passwordHash,
  });

  const token = signToken(user._id, user.role);

  // Explicit response structure ensuring passwordHash is excluded
  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };

  res.status(201).json({
    success: true,
    data: {
      user: userResponse,
      token,
    },
  });
});

/**
 * Log in an existing user.
 * Verifies email and password, preventing user enumeration by returning identical 401 messages.
 */
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user and explicitly select passwordHash
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return next(new AppError('Invalid email or password', 401));
  }

  const token = signToken(user._id, user.role);

  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };

  res.status(200).json({
    success: true,
    data: {
      user: userResponse,
      token,
    },
  });
});
