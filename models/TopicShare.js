const mongoose = require('mongoose');

/**
 * TopicShare Schema
 * Tracks topic sharing relationships between users
 * - ownerId: The user who owns/shared the topic
 * - sharedWithUserId: The user with whom the topic is shared
 * - topicId: The topic being shared
 * - chapterId: Chapter ID (for quick access)
 * - bookId: Book ID (for quick access)
 */
const topicShareSchema = new mongoose.Schema(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    sharedWithUserId: {
      type: String,
      required: true,
      index: true,
    },
    topicId: {
      type: String,
      required: true,
      index: true,
    },
    chapterId: {
      type: String,
      index: true,
    },
    bookId: {
      type: String,
      index: true,
    },
    sharedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Compound index to ensure unique ownerId + sharedWithUserId + topicId combination
topicShareSchema.index({ ownerId: 1, sharedWithUserId: 1, topicId: 1 }, { unique: true });

// Index for faster queries
topicShareSchema.index({ ownerId: 1, topicId: 1 });
topicShareSchema.index({ sharedWithUserId: 1, topicId: 1 });
topicShareSchema.index({ sharedWithUserId: 1 });

const TopicShare = mongoose.model('TopicShare', topicShareSchema);

module.exports = TopicShare;

