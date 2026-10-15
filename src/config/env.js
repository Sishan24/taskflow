import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env if present
dotenv.config();

/**
 * Zod schema for validating required and optional environment variables.
 * In development, provides sensible defaults so the application can be hosted
 * locally out-of-the-box with zero configuration. In production, strictly enforces
 * that MONGO_URI and JWT_SECRET are provided.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/taskflow'),
    JWT_SECRET: z
      .string()
      .default('taskflow_ultra_secure_local_jwt_secret_key_minimum_32_characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5000'),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().positive().default(10),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  })
  .superRefine((data, ctx) => {
    // In production, strictly enforce explicit configuration
    if (data.NODE_ENV === 'production') {
      if (!process.env.MONGO_URI) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'MONGO_URI is required in production environment',
          path: ['MONGO_URI'],
        });
      }
      if (!process.env.JWT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'JWT_SECRET is required in production environment',
          path: ['JWT_SECRET'],
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('CRITICAL: Environment validation failed:');
  console.error(parsed.error.format ? parsed.error.format() : parsed.error.issues);
  process.exit(1);
}

// Export an immutable config object
const env = Object.freeze(parsed.data);

export default env;
export { env };
