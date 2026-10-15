import { Router } from 'express';
import { getAllUsers, getMe } from '../controllers/userController.js';
import protect from '../middleware/auth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = Router();

// WHAT: Retrieve authenticated user profile information
// WHO: Authenticated users (Bearer token required)
// FAILS: 401 if token missing, invalid, expired, or user deleted
router.get('/me', protect, getMe);

// WHAT: List all users in the system with pagination
// WHO: Admin only
// FAILS: 401 if unauthenticated, 403 if authenticated user is not an admin
router.get('/', protect, authorizeRoles('admin'), getAllUsers);

export default router;
