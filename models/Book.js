const mongoose = require('mongoose');

// Flexible schema that accepts any data
const bookSchema = new mongoose.Schema(
  {},
  {
    strict: false, // Allow any fields to be stored
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Ensure book id is unique (if provided)
bookSchema.index({ id: 1 }, { unique: true, sparse: true });

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;

