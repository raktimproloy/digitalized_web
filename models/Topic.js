const mongoose = require('mongoose');

// Flexible schema that accepts any data
const topicSchema = new mongoose.Schema(
  {},
  {
    strict: false, // Allow any fields to be stored
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Index for chapterId to connect topics to chapters
topicSchema.index({ chapterId: 1 });

const Topic = mongoose.model('Topic', topicSchema);

module.exports = Topic;

