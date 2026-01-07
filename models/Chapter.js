const mongoose = require('mongoose');

// Flexible schema that accepts any data
const chapterSchema = new mongoose.Schema(
  {},
  {
    strict: false, // Allow any fields to be stored
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Ensure chapter id is unique (if provided)
chapterSchema.index({ id: 1 }, { unique: true, sparse: true });

// Index for bookId to connect chapters to books
chapterSchema.index({ bookId: 1 });

const Chapter = mongoose.model('Chapter', chapterSchema);

module.exports = Chapter;

