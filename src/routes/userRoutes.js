import { Router } from 'express';
import { getMe } from '../controllers/userController.js';
import protect from '../middleware/auth.js';

const router = Router();

// WHAT: Retrieve authenticated user profile information
// WHO: Authenticated users (Bearer token required)
// FAILS: 401 if token missing, invalid, expired, or user deleted
router.get('/me', protect, getMe);

export default router;
