import { Router } from 'express';
import { createComment } from '../controllers/commentController.js';
import { deleteTask, updateTask } from '../controllers/taskController.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { createCommentSchema } from '../validators/commentValidators.js';
import { taskParamsSchema, updateTaskSchema } from '../validators/taskValidators.js';

const router = Router();

// WHAT: Update an existing task's status, priority, description, or assignment
// WHO: Task creator or current assignee
// FAILS: 400 if validation fails, new assignee not in project, or invalid ID; 401 if unauthenticated; 403 if neither creator nor assignee; 404 if not found
router.patch(
  '/:id',
  protect,
  validate(taskParamsSchema, 'params'),
  validate(updateTaskSchema),
  updateTask
);

// WHAT: Delete a task and cascade delete all its comments
// WHO: Task creator or Project owner
// FAILS: 400 if invalid ObjectId, 401 if unauthenticated, 403 if neither creator nor project owner, 404 if not found
router.delete('/:id', protect, validate(taskParamsSchema, 'params'), deleteTask);

// WHAT: Add a new comment to a task
// WHO: Project members only
// FAILS: 400 if validation fails or invalid ObjectId, 401 if unauthenticated, 403 if not project member, 404 if task not found
router.post(
  '/:id/comments',
  protect,
  validate(taskParamsSchema, 'params'),
  validate(createCommentSchema),
  createComment
);

export default router;
