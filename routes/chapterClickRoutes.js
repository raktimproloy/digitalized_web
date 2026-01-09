const express = require('express');
const router = express.Router();
const {
  recordChapterClick,
  getUserChapterClicks,
} = require('../controllers/chapterClickController');

/**
 * @route   POST /api/chapter-click
 * @desc    Record a chapter click/view for a user
 * @access  Public
 * @body    { userId: "xxx", bookId: "yyy", chapterId: "zzz" }
 */
router.post('/', recordChapterClick);

/**
 * @route   GET /api/chapter-click
 * @desc    Get recent chapter clicks for a user
 * @access  Public
 * @query   userId - The user ID
 */
router.get('/', getUserChapterClicks);

module.exports = router;

