import mongoose from 'mongoose';

/**
 * Comment Schema
 * Represents discussions and notes added to a specific task.
 * Indexed on task for quick comment thread lookups.
 */
const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true,
    minlength: [1, 'Comment text cannot be empty'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Task reference is required'],
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

commentSchema.index({ task: 1 });

export const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
