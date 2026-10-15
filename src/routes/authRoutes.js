import { Router } from 'express';
import { login, register } from '../controllers/authController.js';

const router = Router();

// WHAT: Register a new user account and obtain an authentication token
// WHO: Public (anyone)
// FAILS: 400 if validation fails or fields missing, 409 if email already registered
router.post('/register', register);

// WHAT: Authenticate with email and password to receive a JWT
// WHO: Public (registered users)
// FAILS: 400 if credentials missing, 401 if credentials incorrect
router.post('/login', login);

export default router;
