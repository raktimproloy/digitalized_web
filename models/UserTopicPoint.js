const mongoose = require('mongoose');

// Schema to track points earned by users for topics
const userTopicPointSchema = new mongoose.Schema(
  {
    userId: { 
      type: String, 
      required: true, 
      index: true 
    },
    topicId: { 
      type: String, 
      required: true, 
      index: true 
    },
    chapterId: {
      type: String,
      index: true
    },
    point: {
      type: Number,
      required: true,
      default: 0
    },
    earnedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Compound index to ensure unique userId + topicId combination
userTopicPointSchema.index({ userId: 1, topicId: 1 }, { unique: true });

// Index for faster queries by userId and chapterId
userTopicPointSchema.index({ userId: 1, chapterId: 1 });

const UserTopicPoint = mongoose.model('UserTopicPoint', userTopicPointSchema);

module.exports = UserTopicPoint;

