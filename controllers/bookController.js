const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const Topic = require('../models/Topic');
const mongoose = require('mongoose');

/**
 * Helper function to fetch book with all connected data (chapters and topics)
 */
const fetchBookWithConnections = async (book) => {
  const bookId = book.id || book._id.toString();
  
  // Fetch all chapters for this book
  const chapters = await Chapter.collection.find({ bookId }).toArray();
  
  // For each chapter, fetch its topics
  for (const chapter of chapters) {
    const chapterId = chapter.id || chapter._id.toString();
    const topics = await Topic.collection.find({ chapterId }).toArray();
    chapter.topics = topics;
  }
  
  // Add roadmap (chapters with topics) to book
  book.roadmap = chapters;
  
  return book;
};

/**
 * Create a new book (only book data, no chapters/topics)
 * POST /api/books
 */
const createBook = async (req, res) => {
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
    
    // Accept single book object directly
    const bookData = { ...req.body };
    
    // Check if book already exists by id
    if (bookData.id) {
      const existingBook = await Book.collection.findOne({ id: bookData.id });
      if (existingBook) {
        // Fetch all connected data
        const bookWithConnections = await fetchBookWithConnections(existingBook);
        return res.status(200).json({
          success: true,
          message: 'Book already exists',
          data: [bookWithConnections],
        });
      }
    }
    
    // Add timestamps if not provided
    const now = new Date();
    if (!bookData.createdAt) bookData.createdAt = now;
    if (!bookData.updatedAt) bookData.updatedAt = now;
    
    // Insert book directly into collection (no validation)
    const bookResult = await Book.collection.insertOne(bookData);
    
    // Fetch the created book
    let book = await Book.collection.findOne({ _id: bookResult.insertedId });
    
    // Fetch all connected data
    const bookWithConnections = await fetchBookWithConnections(book);
    
    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      data: [bookWithConnections],
    });
  } catch (error) {
    // Log the full error for debugging
    console.error('Error creating book:', error);
    console.error('Error stack:', error.stack);
    
    // Handle duplicate key error - find and return existing document
    if (error.code === 11000) {
      let existingBook = null;
      
      // Try to find by id if it was in the request
      if (req.body.id) {
        existingBook = await Book.collection.findOne({ id: req.body.id });
      }
      
      // If we found the existing book, return success with it
      if (existingBook) {
        const bookWithConnections = await fetchBookWithConnections(existingBook);
        return res.status(200).json({
          success: true,
          message: 'Book already exists',
          data: [bookWithConnections],
        });
      }
      
      // If we couldn't find it, return generic duplicate error
      return res.status(200).json({
        success: true,
        message: 'Book already exists',
        data: [],
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
 * Get book by id with all connected data (chapters and topics)
 * GET /api/books/:id
 */
const getBook = async (req, res) => {
  try {
    const bookId = req.params.id;

    if (!bookId) {
      return res.status(400).json({
        success: false,
        error: 'Book id is required',
      });
    }

    // Find book by id field or _id
    let book = await Book.collection.findOne({ id: bookId });
    if (!book) {
      book = await Book.collection.findOne({ _id: bookId });
    }

    if (!book) {
      return res.status(404).json({
        success: false,
        error: 'Book not found',
      });
    }

    // Fetch all connected data (chapters and topics)
    const bookWithConnections = await fetchBookWithConnections(book);

    res.status(200).json({
      success: true,
      data: [bookWithConnections],
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
 * Get all books with all connected data
 * GET /api/books
 */
const getAllBooks = async (req, res) => {
  try {
    const books = await Book.collection.find({}).sort({ createdAt: -1 }).toArray();

    // For each book, fetch all connected data
    for (const book of books) {
      await fetchBookWithConnections(book);
    }

    res.status(200).json({
      success: true,
      count: books.length,
      data: books,
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
 * Update book by id
 * PUT /api/books/:id
 * PATCH /api/books/:id
 */
const updateBook = async (req, res) => {
  try {
    const bookId = req.params.id;

    if (!bookId) {
      return res.status(400).json({
        success: false,
        error: 'Book id is required',
      });
    }

    // Find book
    let book = await Book.collection.findOne({ id: bookId });
    if (!book) {
      book = await Book.collection.findOne({ _id: bookId });
    }

    if (!book) {
      return res.status(404).json({
        success: false,
        error: 'Book not found',
      });
    }

    // Update book
    const updateData = { ...req.body };
    const now = new Date();
    updateData.updatedAt = now;

    const updatedBook = await Book.collection.findOneAndUpdate(
      { _id: book._id },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    // Fetch book with all connections
    const bookWithConnections = await fetchBookWithConnections(updatedBook);

    res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      data: [bookWithConnections],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
};

module.exports = {
  createBook,
  getBook,
  getAllBooks,
  updateBook,
};
