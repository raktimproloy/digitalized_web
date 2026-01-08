const mongoose = require('mongoose');

// Flexible schema that accepts any data for user notes
const userNoteSchema = new mongoose.Schema(
  {},
  {
    strict: false, // Allow any fields to be stored
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Index for userId and topicId for faster queries
userNoteSchema.index({ userId: 1, topicId: 1 });

const UserNote = mongoose.model('UserNote', userNoteSchema);

module.exports = UserNote;

