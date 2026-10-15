import { z } from 'zod';

/**
 * 24-character hex MongoDB ObjectId schema.
 */
export const objectIdSchema = z
  .string({ required_error: 'ID is required' })
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

/**
 * Schema for creating a project workspace.
 */
export const createProjectSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title cannot be empty')
    .max(100, 'Title cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
});

/**
 * Schema for updating an existing project.
 * Requires at least one field (title or description).
 */
export const updateProjectSchema = createProjectSchema
  .partial()
  .refine((data) => data.title !== undefined || data.description !== undefined, {
    message: 'At least one field (title or description) must be provided for update',
  });

/**
 * Schema for adding a collaborator to a project.
 * Requires either userId (valid ObjectId) or email (valid email).
 */
export const addMemberSchema = z
  .object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId').optional(),
    email: z.string().email('Invalid email address').optional(),
  })
  .refine((data) => data.userId !== undefined || data.email !== undefined, {
    message: 'Either userId or email must be provided',
  });

/**
 * Route parameter schema for project ID.
 */
export const projectParamsSchema = z.object({
  id: objectIdSchema,
});
