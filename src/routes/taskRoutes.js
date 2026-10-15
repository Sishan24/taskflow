import { Router } from 'express';
import { deleteTask, updateTask } from '../controllers/taskController.js';
import protect from '../middleware/auth.js';

const router = Router();

// WHAT: Update an existing task's status, priority, description, or assignment
// WHO: Task creator or current assignee
// FAILS: 400 if new assignee not in project, 401 if unauthenticated, 403 if neither creator nor assignee, 404 if not found
router.patch('/:id', protect, updateTask);

// WHAT: Delete a task and cascade delete all its comments
// WHO: Task creator or Project owner
// FAILS: 401 if unauthenticated, 403 if neither creator nor project owner, 404 if not found
router.delete('/:id', protect, deleteTask);

export default router;
