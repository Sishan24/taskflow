import { z } from 'zod';

/**
 * Schema for creating a task comment.
 */
export const createCommentSchema = z.object({
  text: z
    .string({ required_error: 'Text is required' })
    .min(1, 'Comment text cannot be empty')
    .max(1000, 'Comment text cannot exceed 1000 characters'),
});
