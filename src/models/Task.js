import mongoose from 'mongoose';

/**
 * Task Schema
 * Represents an actionable work item inside a project.
 * Supports status tracking, priority, due dates, and assignee.
 */
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [1, 'Title cannot be empty'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  status: {
    type: String,
    enum: {
      values: ['todo', 'in-progress', 'done'],
      message: 'Status must be todo, in-progress, or done',
    },
    default: 'todo',
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: 'Priority must be low, medium, or high',
    },
    default: 'medium',
  },
  dueDate: {
    type: Date,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project reference is required'],
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

taskSchema.index({ project: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ assignedTo: 1 });

export const Task = mongoose.model('Task', taskSchema);
export default Task;
