import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Add a comment to a task.
 * Caller must be a member of the project that owns the task.
 */
export const createComment = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id).populate('project');

  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  const project = task.project;
  if (!project) {
    return next(new AppError('Associated project not found', 404));
  }

  // Check project membership (owner or member list)
  const uid = req.user._id.toString();
  const ownerId = project.owner ? (project.owner._id || project.owner).toString() : '';
  const isOwner = ownerId === uid;
  const isMember =
    project.members && project.members.some((m) => (m._id || m).toString() === uid);

  if (!isOwner && !isMember) {
    return next(
      new AppError('Forbidden: Only members of this project can add comments to its tasks', 403)
    );
  }

  const { text } = req.body;

  const comment = await Comment.create({
    text,
    task: task._id,
    author: req.user._id,
  });

  const populatedComment = await Comment.findById(comment._id).populate(
    'author',
    'name email'
  );

  res.status(201).json({
    success: true,
    data: {
      comment: populatedComment,
    },
  });
});
