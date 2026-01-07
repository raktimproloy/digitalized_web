const express = require('express');
const router = express.Router();
const {
  createTopic,
  getTopic,
  getAllTopics,
  updateTopic,
} = require('../controllers/topicController');

/**
 * @route   POST /api/topics
 * @desc    Create a new topic (requires bookId and chapterId)
 * @access  Public
 */
router.post('/', createTopic);

/**
 * @route   GET /api/topics
 * @desc    Get all topics with connected data
 * @access  Public
 */
router.get('/', getAllTopics);

/**
 * @route   GET /api/topics/:id
 * @desc    Get topic by id with connected data
 * @access  Public
 */
router.get('/:id', getTopic);

/**
 * @route   PUT /api/topics/:id
 * @desc    Update topic by id
 * @access  Public
 */
router.put('/:id', updateTopic);

/**
 * @route   PATCH /api/topics/:id
 * @desc    Partially update topic by id
 * @access  Public
 */
router.patch('/:id', updateTopic);

module.exports = router;

