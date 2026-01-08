const express = require('express');
const router = express.Router();
const {
  createTopic,
  getTopic,
  getAllTopics,
  updateTopic,
  unlockTopicForUser,
  getUserChapterPoints,
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

/**
 * @route   POST /api/topics/:id/unlock
 * @desc    Unlock next topic for a user and store points for current topic
 * @access  Public
 */
router.post('/:id/unlock', unlockTopicForUser);

/**
 * @route   GET /api/topics/points
 * @desc    Get point count for a user by chapter
 * @access  Public
 */
router.get('/points', getUserChapterPoints);

module.exports = router;

