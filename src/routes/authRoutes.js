import { Router } from 'express';
import { login, register } from '../controllers/authController.js';
import validate from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/authValidators.js';

const router = Router();

// WHAT: Register a new user account and obtain an authentication token
// WHO: Public (anyone)
// FAILS: 400 if validation fails or fields missing, 409 if email already registered
router.post('/register', validate(registerSchema), register);

// WHAT: Authenticate with email and password to receive a JWT
// WHO: Public (registered users)
// FAILS: 400 if credentials missing or invalid, 401 if credentials incorrect
router.post('/login', validate(loginSchema), login);

export default router;
