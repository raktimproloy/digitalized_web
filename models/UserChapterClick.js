const mongoose = require('mongoose');

/**
 * UserChapterClick Schema
 * Tracks the most recent chapter clicked/viewed by a user for each book
 */
const userChapterClickSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    bookId: {
      type: String,
      required: true,
      index: true,
    },
    chapterId: {
      type: String,
      required: true,
    },
    clickedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Compound index to ensure unique userId + bookId combination (one recent chapter per book per user)
userChapterClickSchema.index({ userId: 1, bookId: 1 }, { unique: true });

// Index for faster queries
userChapterClickSchema.index({ userId: 1 });
userChapterClickSchema.index({ bookId: 1 });

const UserChapterClick = mongoose.model('UserChapterClick', userChapterClickSchema);

module.exports = UserChapterClick;

