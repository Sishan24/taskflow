import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import parsePagination from '../utils/paginationHelper.js';

/**
 * Return current authenticated user profile.
 * req.user is set by the protect middleware.
 */
export const getMe = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

/**
 * Return all users with basic pagination.
 * Restricted to administrators.
 */
export const getAllUsers = asyncHandler(async (req, res, next) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [users, total] = await Promise.all([
    User.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});
