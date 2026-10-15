import { Router } from 'express';
import {
  addMember,
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject,
} from '../controllers/projectController.js';
import { createTask, getTasks } from '../controllers/taskController.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  addMemberSchema,
  createProjectSchema,
  projectParamsSchema,
  updateProjectSchema,
} from '../validators/projectValidators.js';
import { createTaskSchema, taskQuerySchema } from '../validators/taskValidators.js';

const router = Router();

// WHAT: Create a new project workspace
// WHO: Authenticated users
// FAILS: 400 if validation fails, 401 if unauthenticated
router.post('/', protect, validate(createProjectSchema), createProject);

// WHAT: List all projects where user is owner or member
// WHO: Authenticated users
// FAILS: 401 if unauthenticated
router.get('/', protect, getProjects);

// WHAT: Retrieve project details including owner and members
// WHO: Project owner or project members
// FAILS: 400 if invalid ObjectId, 401 if unauthenticated, 404 if project not found or user is not a member
router.get('/:id', protect, validate(projectParamsSchema, 'params'), getProject);

// WHAT: Update project title or description
// WHO: Project owner only
// FAILS: 400 if validation fails or invalid ObjectId, 401 if unauthenticated, 403 if not owner, 404 if project not found
router.patch(
  '/:id',
  protect,
  validate(projectParamsSchema, 'params'),
  validate(updateProjectSchema),
  updateProject
);

// WHAT: Delete project and cascade delete tasks and comments
// WHO: Project owner or Admin
// FAILS: 400 if invalid ObjectId, 401 if unauthenticated, 403 if neither owner nor admin, 404 if not found
router.delete('/:id', protect, validate(projectParamsSchema, 'params'), deleteProject);

// WHAT: Add a collaborator to the project
// WHO: Project owner only
// FAILS: 400 if validation fails, 401 if unauthenticated, 403 if not owner, 404 if user/project not found, 409 if already a member
router.post(
  '/:id/members',
  protect,
  validate(projectParamsSchema, 'params'),
  validate(addMemberSchema),
  addMember
);

// WHAT: Create a new task within the specified project
// WHO: Project members only
// FAILS: 400 if validation fails or assignee not in project, 401 if unauthenticated, 403 if not project member, 404 if project not found
router.post(
  '/:id/tasks',
  protect,
  validate(projectParamsSchema, 'params'),
  validate(createTaskSchema),
  createTask
);

// WHAT: List all tasks in a project with filter, sort, and pagination
// WHO: Project members only
// FAILS: 400 if invalid ObjectId or query params, 401 if unauthenticated, 403 if not project member, 404 if project not found
router.get(
  '/:id/tasks',
  protect,
  validate(projectParamsSchema, 'params'),
  validate(taskQuerySchema, 'query'),
  getTasks
);

export default router;
