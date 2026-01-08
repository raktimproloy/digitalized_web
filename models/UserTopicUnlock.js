const mongoose = require('mongoose');

// Schema to track which topics are unlocked for which users
const userTopicUnlockSchema = new mongoose.Schema(
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
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Compound index to ensure unique userId + topicId combination
userTopicUnlockSchema.index({ userId: 1, topicId: 1 }, { unique: true });

const UserTopicUnlock = mongoose.model('UserTopicUnlock', userTopicUnlockSchema);

module.exports = UserTopicUnlock;

