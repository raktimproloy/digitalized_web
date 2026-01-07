const express = require('express');
const router = express.Router();
const {
  createUser,
  getUser,
  getAllUsers,
  updateUser,
} = require('../controllers/userController');

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Public
 */
router.post('/', createUser);

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Public
 */
router.get('/', getAllUsers);

/**
 * @route   GET /api/users/:phoneNumber
 * @desc    Get user by phone number
 * @access  Public
 */
router.get('/:phoneNumber', getUser);

/**
 * @route   PUT /api/users/:phoneNumber
 * @desc    Update user by phone number
 * @access  Public
 */
router.put('/:phoneNumber', updateUser);

/**
 * @route   PATCH /api/users/:phoneNumber
 * @desc    Partially update user by phone number
 * @access  Public
 */
router.patch('/:phoneNumber', updateUser);

module.exports = router;

