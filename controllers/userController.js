const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Create a new user
 * POST /api/users
 */
const createUser = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Please wait for the database connection to be established',
      });
    }
    
    // Check if user already exists by _id, phoneNumber, or email
    let existingUser = null;
    
    // Check by _id if provided
    if (req.body._id) {
      existingUser = await User.collection.findOne({ _id: req.body._id });
      if (existingUser) {
        return res.status(200).json({
          success: true,
          message: 'User already exists',
          data: existingUser,
        });
      }
    }
    
    // Check by phoneNumber if provided
    if (req.body.phoneNumber) {
      existingUser = await User.findOne({ phoneNumber: req.body.phoneNumber });
      if (existingUser) {
        return res.status(200).json({
          success: true,
          message: 'User already exists',
          data: existingUser,
        });
      }
    }
    
    // Check by email if provided
    if (req.body.email) {
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
    
    // Add timestamps if not provided (since we're bypassing Mongoose)
    const now = new Date();
    if (!userData.createdAt) userData.createdAt = now;
    if (!userData.updatedAt) userData.updatedAt = now;
    
    // Insert directly into collection to bypass all validation
    const result = await User.collection.insertOne(userData);
    
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
      
      // Try to find by _id if it was in the request
      if (req.body._id) {
        existingUser = await User.collection.findOne({ _id: req.body._id });
      }
      
      // If not found by _id, try phoneNumber
      if (!existingUser && req.body.phoneNumber) {
        existingUser = await User.findOne({ phoneNumber: req.body.phoneNumber });
      }
      
      // If not found, try email
      if (!existingUser && req.body.email) {
        existingUser = await User.findOne({ email: req.body.email });
      }
      
      // If we found the existing user, return success with it
      if (existingUser) {
        return res.status(200).json({
          success: true,
          message: 'User already exists',
          data: existingUser,
        });
      }
      
      // If we couldn't find it, return generic duplicate error
      return res.status(200).json({
        success: true,
        message: 'User already exists',
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

