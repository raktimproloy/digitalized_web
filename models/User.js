const mongoose = require('mongoose');

// Flexible schema that accepts any data
const userSchema = new mongoose.Schema(
  {},
  {
    strict: false, // Allow any fields to be stored
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Ensure phone number is unique (if provided)
userSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });

const User = mongoose.model('User', userSchema);

module.exports = User;

