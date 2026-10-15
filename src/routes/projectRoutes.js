import { Router } from 'express';
import {
  addMember,
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject,
} from '../controllers/projectController.js';
import protect from '../middleware/auth.js';

const router = Router();

// WHAT: Create a new project workspace
// WHO: Authenticated users
// FAILS: 400 if validation fails, 401 if unauthenticated
router.post('/', protect, createProject);

// WHAT: List all projects where user is owner or member
// WHO: Authenticated users
// FAILS: 401 if unauthenticated
router.get('/', protect, getProjects);

// WHAT: Retrieve project details including owner and members
// WHO: Project owner or project members
// FAILS: 401 if unauthenticated, 404 if project not found or user is not a member
router.get('/:id', protect, getProject);

// WHAT: Update project title or description
// WHO: Project owner only
// FAILS: 401 if unauthenticated, 403 if not owner, 404 if project not found
router.patch('/:id', protect, updateProject);

// WHAT: Delete project and cascade delete tasks and comments
// WHO: Project owner or Admin
// FAILS: 401 if unauthenticated, 403 if neither owner nor admin, 404 if not found
router.delete('/:id', protect, deleteProject);

// WHAT: Add a collaborator to the project
// WHO: Project owner only
// FAILS: 401 if unauthenticated, 403 if not owner, 404 if user/project not found, 409 if already a member
router.post('/:id/members', protect, addMember);

export default router;
