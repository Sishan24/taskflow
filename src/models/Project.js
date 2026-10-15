import mongoose from 'mongoose';

/**
 * Project Schema
 * Represents a workspace containing tasks and collaborative members.
 * Indexed on owner and members for fast user-membership queries.
 */
const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    minlength: [1, 'Title cannot be empty'],
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Project owner is required'],
    index: true,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

projectSchema.index({ owner: 1 });
projectSchema.index({ members: 1 });

export const Project = mongoose.model('Project', projectSchema);
export default Project;
