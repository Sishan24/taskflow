import Comment from '../models/Comment.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import parsePagination from '../utils/paginationHelper.js';

/**
 * Check if a user is a member of the given project.
 *
 * @param {Object} project
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {boolean}
 */
function isProjectMember(project, userId) {
  if (!project) return false;
  const uid = userId.toString();
  const ownerId = project.owner ? (project.owner._id || project.owner).toString() : '';
  if (ownerId === uid) return true;
  if (!project.members || !Array.isArray(project.members)) return false;
  return project.members.some((m) => (m._id || m).toString() === uid);
}

/**
 * Create a new task within a project.
 * Caller must be a project member.
 * If assignedTo is supplied, the assignee must be a project member.
 */
export const createTask = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  if (!isProjectMember(project, req.user._id)) {
    return next(new AppError('Forbidden: You must be a project member to create tasks', 403));
  }

  const { title, description, status, priority, dueDate, assignedTo } = req.body;

  // Validate assignee membership if assignedTo is provided
  if (assignedTo) {
    if (!isProjectMember(project, assignedTo)) {
      return next(new AppError('Assigned user must be a member of the project', 400));
    }
  }

  const task = await Task.create({
    title,
    description,
    status,
    priority,
    dueDate,
    assignedTo,
    createdBy: req.user._id,
    project: project._id,
  });

  res.status(201).json({
    success: true,
    data: {
      task,
    },
  });
});

/**
 * List tasks belonging to a project with filter, sort, and pagination.
 * Caller must be a project member.
 */
export const getTasks = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError('Project not found', 404));
  }

  if (!isProjectMember(project, req.user._id)) {
    return next(new AppError('Forbidden: You must be a project member to view tasks', 403));
  }

  // Filter criteria
  const filter = { project: project._id };
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.priority) {
    filter.priority = req.query.priority;
  }
  if (req.query.assignedTo) {
    filter.assignedTo = req.query.assignedTo;
  }

  // Sort criteria (e.g. '-dueDate', 'title')
  let sort = { createdAt: -1 };
  if (req.query.sort) {
    const sortParam = req.query.sort;
    const isDesc = sortParam.startsWith('-');
    const field = isDesc ? sortParam.slice(1) : sortParam;
    sort = { [field]: isDesc ? -1 : 1 };
  }

  // Pagination
  const { page, limit, skip } = parsePagination(req.query);

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email'),
    Task.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * Update an existing task.
 * Caller must be the task creator or current assignee.
 * If assignee is modified, new assignee must be a project member.
 */
export const updateTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id).populate('project');

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  const isCreator = task.createdBy.toString() === req.user._id.toString();
  const isAssignee = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();

  if (!isCreator && !isAssignee) {
    return next(
      new AppError('Forbidden: Only the task creator or assignee can update this task', 403)
    );
  }

  // Verify new assignee if assignedTo is updated
  if (req.body.assignedTo !== undefined) {
    if (req.body.assignedTo) {
      const project = await Project.findById(task.project._id || task.project);
      if (!isProjectMember(project, req.body.assignedTo)) {
        return next(new AppError('Assigned user must be a member of the project', 400));
      }
      task.assignedTo = req.body.assignedTo;
    } else {
      task.assignedTo = undefined;
    }
  }

  const { title, description, status, priority, dueDate } = req.body;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (status !== undefined) task.status = status;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;

  await task.save();

  res.status(200).json({
    success: true,
    data: {
      task,
    },
  });
});

/**
 * Delete a task and cascade delete its comments.
 * Caller must be the task creator or the project owner.
 */
export const deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id).populate('project');

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  const isCreator = task.createdBy.toString() === req.user._id.toString();
  const projectOwnerId = task.project?.owner
    ? (task.project.owner._id || task.project.owner).toString()
    : '';
  const isProjectOwner = projectOwnerId === req.user._id.toString();

  if (!isCreator && !isProjectOwner) {
    return next(
      new AppError('Forbidden: Only the task creator or project owner can delete this task', 403)
    );
  }

  // Cascade delete task comments first
  await Comment.deleteMany({ task: task._id });

  // Delete task
  await Task.findByIdAndDelete(task._id);

  res.status(200).json({
    success: true,
    message: 'Task and associated comments deleted successfully',
  });
});
