import Comment from '../models/Comment.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Helper to check whether a user is the owner of a project.
 *
 * @param {Object} project - Project document
 * @param {string|mongoose.Types.ObjectId} userId - User ID
 * @returns {boolean}
 */
function isOwner(project, userId) {
  if (!project || !project.owner) return false;
  const ownerId = project.owner._id ? project.owner._id.toString() : project.owner.toString();
  return ownerId === userId.toString();
}

/**
 * Helper to check whether a user is a member (or owner) of a project.
 *
 * @param {Object} project - Project document
 * @param {string|mongoose.Types.ObjectId} userId - User ID
 * @returns {boolean}
 */
function isMember(project, userId) {
  if (!project) return false;
  if (isOwner(project, userId)) return true;
  if (!project.members || !Array.isArray(project.members)) return false;
  return project.members.some((member) => {
    const memberId = member._id ? member._id.toString() : member.toString();
    return memberId === userId.toString();
  });
}

/**
 * Create a new project.
 * Automatically assigns the creator as owner and first member.
 */
export const createProject = asyncHandler(async (req, res, next) => {
  const { title, description } = req.body;

  const project = await Project.create({
    title,
    description,
    owner: req.user._id,
    members: [req.user._id],
  });

  res.status(201).json({
    success: true,
    data: {
      project,
    },
  });
});

/**
 * Get all projects where the authenticated user is either owner or member.
 */
export const getProjects = asyncHandler(async (req, res, next) => {
  const projects = await Project.find({
    $or: [{ owner: req.user._id }, { members: req.user._id }],
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      projects,
    },
  });
});

/**
 * Get a single project by ID with populated owner and members.
 * Returns 404 if not found or caller is not a member (to prevent existence leakage).
 */
export const getProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id)
    .populate('owner', 'name email')
    .populate('members', 'name email');

  if (!project || !isMember(project, req.user._id)) {
    return next(new AppError('Project not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      project,
    },
  });
});

/**
 * Update project details (title, description).
 * Restricted strictly to the project owner.
 */
export const updateProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  if (!isOwner(project, req.user._id)) {
    return next(new AppError('Forbidden: Only the project owner can update this project', 403));
  }

  const { title, description } = req.body;
  if (title !== undefined) project.title = title;
  if (description !== undefined) project.description = description;

  await project.save();

  res.status(200).json({
    success: true,
    data: {
      project,
    },
  });
});

/**
 * Delete a project and cascade delete all its tasks and task comments.
 * Restricted to project owner or system admin.
 * Uses sequential awaits (partial cascade acceptable if interrupted).
 */
export const deleteProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  const canDelete = isOwner(project, req.user._id) || req.user.role === 'admin';
  if (!canDelete) {
    return next(
      new AppError('Forbidden: Only the project owner or an admin can delete this project', 403)
    );
  }

  // 1. Find all task IDs under this project
  const tasks = await Task.find({ project: project._id }).select('_id');
  const taskIds = tasks.map((t) => t._id);

  // 2. Cascade delete all comments belonging to these tasks
  if (taskIds.length > 0) {
    await Comment.deleteMany({ task: { $in: taskIds } });
  }

  // 3. Delete all tasks belonging to this project
  await Task.deleteMany({ project: project._id });

  // 4. Delete the project itself
  await Project.findByIdAndDelete(project._id);

  res.status(200).json({
    success: true,
    message: 'Project and associated tasks/comments deleted successfully',
  });
});

/**
 * Add a member to the project by userId or email.
 * Restricted strictly to the project owner.
 */
export const addMember = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  if (!isOwner(project, req.user._id)) {
    return next(new AppError('Forbidden: Only the project owner can add members', 403));
  }

  const { userId, email } = req.body;
  let targetUser;

  if (userId) {
    targetUser = await User.findById(userId);
  } else if (email) {
    targetUser = await User.findOne({ email });
  }

  if (!targetUser) {
    return next(new AppError('Target user not found', 404));
  }

  // Check if target is already in members array
  const alreadyMember = project.members.some(
    (m) => m.toString() === targetUser._id.toString()
  );

  if (alreadyMember) {
    return next(new AppError('User is already a member of this project', 409));
  }

  project.members.push(targetUser._id);
  await project.save();

  const populatedProject = await Project.findById(project._id)
    .populate('owner', 'name email')
    .populate('members', 'name email');

  res.status(200).json({
    success: true,
    data: {
      project: populatedProject,
    },
  });
});

export { isMember, isOwner };
