const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Create a new user
 * POST /api/users
 */
const createUser = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    
    // Check if user already exists by _id, phoneNumber, or email
    let existingUser = null;
    
    // Check by _id if provided (try both string and ObjectId format)
    if (req.body._id) {
      const idValue = req.body._id;
      
      // Try to find by _id as string
      try {
        existingUser = await User.collection.findOne({ _id: idValue });
      } catch (e) {
        // If string doesn't work, try as ObjectId
        if (mongoose.Types.ObjectId.isValid(idValue)) {
          try {
            existingUser = await User.collection.findOne({ _id: new mongoose.Types.ObjectId(idValue) });
          } catch (e2) {
            // Ignore and continue
          }
        }
      }
      
      // Also try finding by custom 'id' field if _id search didn't work
      if (!existingUser) {
        existingUser = await User.collection.findOne({ id: idValue });
      }
      
      if (existingUser) {
        return res.status(200).json({
          success: true,
          message: 'User already exists',
          data: existingUser,
        });
      }
    }
    
    // Check by phoneNumber if provided and not null/empty
    if (req.body.phoneNumber && req.body.phoneNumber.trim() !== '') {
      existingUser = await User.findOne({ phoneNumber: req.body.phoneNumber });
      if (existingUser) {
        return res.status(200).json({
          success: true,
          message: 'User already exists',
          data: existingUser,
        });
      }
    }
    
    // Check by email if provided and not null/empty
    if (req.body.email && req.body.email.trim() !== '') {
      existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        return res.status(200).json({
          success: true,
          message: 'User already exists',
          data: existingUser,
        });
      }
    }

    // Create new user with all data from request body (no validation)
    // Use collection.insertOne() to bypass all Mongoose validation including _id validation
    const userData = { ...req.body };
    
    // Remove null/empty phoneNumber to avoid unique index issues
    if (userData.phoneNumber === null || userData.phoneNumber === '' || userData.phoneNumber === undefined) {
      delete userData.phoneNumber;
    }
    
    // Remove null/empty email to avoid potential issues
    if (userData.email === null || userData.email === '' || userData.email === undefined) {
      delete userData.email;
    }
    
    // Add timestamps if not provided (since we're bypassing Mongoose)
    const now = new Date();
    if (!userData.createdAt) userData.createdAt = now;
    if (!userData.updatedAt) userData.updatedAt = now;
    
    // Insert directly into collection to bypass all validation
    const result = await User.collection.insertOne(userData);
    console.log('result', result);
    // Fetch the created document using collection to avoid Mongoose casting issues
    const user = await User.collection.findOne({ _id: result.insertedId });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    // Log the full error for debugging
    console.error('Error creating user:', error);
    console.error('Error stack:', error.stack);
    
    // Handle duplicate key error - find and return existing document
    if (error.code === 11000) {
      let existingUser = null;
      let duplicateField = 'unknown';
      
      // Extract the duplicate field from error message
      if (error.keyPattern) {
        duplicateField = Object.keys(error.keyPattern)[0] || 'unknown';
      } else if (error.message) {
        // Try to extract field name from error message
        const match = error.message.match(/index: (\w+)_\d+/);
        if (match) {
          duplicateField = match[1];
        }
      }
      
      // Try to find by _id if it was in the request
      if (req.body._id) {
        const idValue = req.body._id;
        try {
          existingUser = await User.collection.findOne({ _id: idValue });
        } catch (e) {
          if (mongoose.Types.ObjectId.isValid(idValue)) {
            try {
              existingUser = await User.collection.findOne({ _id: new mongoose.Types.ObjectId(idValue) });
            } catch (e2) {
              // Try by custom 'id' field
              existingUser = await User.collection.findOne({ id: idValue });
            }
          } else {
            existingUser = await User.collection.findOne({ id: idValue });
          }
        }
      }
      
      // If not found by _id, try phoneNumber
      if (!existingUser && req.body.phoneNumber && req.body.phoneNumber.trim() !== '') {
        existingUser = await User.findOne({ phoneNumber: req.body.phoneNumber });
      }
      
      // If not found, try email
      if (!existingUser && req.body.email && req.body.email.trim() !== '') {
        existingUser = await User.findOne({ email: req.body.email });
      }
      
      // If we found the existing user, return success with it
      if (existingUser) {
        return res.status(200).json({
          success: true,
          message: 'User already exists',
          data: existingUser,
          duplicateField: duplicateField,
        });
      }
      
      // If we couldn't find it, return error with duplicate field info
      return res.status(409).json({
        success: false,
        error: 'Duplicate key error',
        message: `User with this ${duplicateField} already exists`,
        duplicateField: duplicateField,
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message,
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * Get user by phone number
 * GET /api/users?phoneNumber=1234567890
 * GET /api/users/:phoneNumber
 */
const getUser = async (req, res) => {
  try {
    const phoneNumber = req.params.phoneNumber || req.query.phoneNumber;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * Get all users
 * GET /api/users
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * Update user by phone number
 * PUT /api/users/:phoneNumber
 * PATCH /api/users/:phoneNumber
 */
const updateUser = async (req, res) => {
  try {
    const phoneNumber = req.params.phoneNumber || req.query.phoneNumber;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    // Find user
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Prevent updating phone number to an existing one
    if (req.body.phoneNumber && req.body.phoneNumber !== phoneNumber) {
      const existingUser = await User.findOne({ phoneNumber: req.body.phoneNumber });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Phone number already exists',
        });
      }
    }

    // Update user with all data from request body (no validation)
    const updatedUser = await User.findOneAndUpdate(
      { phoneNumber },
      req.body,
      {
        new: true, // Return updated document
        runValidators: false, // Don't run schema validators
      }
    );

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Phone number already exists',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
};

module.exports = {
  createUser,
  getUser,
  getAllUsers,
  updateUser,
};

