const mongoose = require('mongoose');

// Flexible schema that accepts any data
const userSchema = new mongoose.Schema(
  {},
  {
    strict: false, // Allow any fields to be stored
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Ensure phone number is unique (if provided and not null)
// Using partial filter to exclude null/undefined values from uniqueness constraint
userSchema.index(
  { phoneNumber: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { phoneNumber: { $exists: true, $ne: null } }
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;

