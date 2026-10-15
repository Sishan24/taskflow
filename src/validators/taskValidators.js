import { z } from 'zod';
import { objectIdSchema } from './projectValidators.js';

/**
 * Schema for creating a task in a project.
 */
export const createTaskSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  status: z.enum(['todo', 'in-progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z
    .union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')])
    .optional(),
  assignedTo: objectIdSchema.optional(),
});

/**
 * Schema for updating an existing task.
 * Requires at least one field to be modified.
 */
export const updateTaskSchema = createTaskSchema
  .partial()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.status !== undefined ||
      data.priority !== undefined ||
      data.dueDate !== undefined ||
      data.assignedTo !== undefined,
    {
      message: 'At least one field must be provided for update',
    }
  );

/**
 * Schema for query string filters, sorting, and pagination on tasks.
 */
export const taskQuerySchema = z.object({
  status: z.enum(['todo', 'in-progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignedTo: objectIdSchema.optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

/**
 * Route parameter schema for task ID.
 */
export const taskParamsSchema = z.object({
  id: objectIdSchema,
});
