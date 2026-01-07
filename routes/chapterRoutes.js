const express = require('express');
const router = express.Router();
const {
  createChapter,
  getChapter,
  getAllChapters,
  updateChapter,
} = require('../controllers/chapterController');

/**
 * @route   POST /api/chapters
 * @desc    Create a new chapter (requires bookId)
 * @access  Public
 */
router.post('/', createChapter);

/**
 * @route   GET /api/chapters
 * @desc    Get all chapters with connected data
 * @access  Public
 */
router.get('/', getAllChapters);

/**
 * @route   GET /api/chapters/:id
 * @desc    Get chapter by id with connected data
 * @access  Public
 */
router.get('/:id', getChapter);

/**
 * @route   PUT /api/chapters/:id
 * @desc    Update chapter by id
 * @access  Public
 */
router.put('/:id', updateChapter);

/**
 * @route   PATCH /api/chapters/:id
 * @desc    Partially update chapter by id
 * @access  Public
 */
router.patch('/:id', updateChapter);

module.exports = router;

