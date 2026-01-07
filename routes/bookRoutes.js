const express = require('express');
const router = express.Router();
const {
  createBook,
  getBook,
  getAllBooks,
  updateBook,
} = require('../controllers/bookController');

/**
 * @route   POST /api/books
 * @desc    Create a new book (or books if array provided)
 * @access  Public
 */
router.post('/', createBook);

/**
 * @route   GET /api/books
 * @desc    Get all books
 * @access  Public
 */
router.get('/', getAllBooks);

/**
 * @route   GET /api/books/:id
 * @desc    Get book by id
 * @access  Public
 */
router.get('/:id', getBook);

/**
 * @route   PUT /api/books/:id
 * @desc    Update book by id
 * @access  Public
 */
router.put('/:id', updateBook);

/**
 * @route   PATCH /api/books/:id
 * @desc    Partially update book by id
 * @access  Public
 */
router.patch('/:id', updateBook);

module.exports = router;

