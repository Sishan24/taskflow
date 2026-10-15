import asyncHandler from '../utils/asyncHandler.js';

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
