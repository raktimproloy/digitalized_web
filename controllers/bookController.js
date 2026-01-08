const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const Topic = require('../models/Topic');
const UserTopicUnlock = require('../models/UserTopicUnlock');
const mongoose = require('mongoose');

/**
 * Helper function to fetch book with all connected data (chapters and topics)
 * Note: Topic content is excluded to reduce response size
 * If userId is provided, only returns unlocked topics for that user
 * Removes status fields from chapters and topics (no locked/unlocked system in DB)
 */
const fetchBookWithConnections = async (book, userId = null) => {
  const bookId = book.id || book._id.toString();
  
  // Fetch all chapters for this book
  const chapters = await Chapter.collection.find({ bookId }).toArray();
  
  // Get unlocked topic IDs for this user if userId is provided
  let unlockedTopicIds = new Set();
  if (userId) {
    const unlocks = await UserTopicUnlock.find({ userId }).lean();
    unlocks.forEach(unlock => {
      // Store topicId (this is the field we use to track unlocks)
      const topicId = unlock.topicId;
      if (topicId) {
        unlockedTopicIds.add(topicId.toString());
      }
    });
  }
  
  // For each chapter, fetch its topics (excluding content field)
  for (const chapter of chapters) {
    const chapterId = chapter.id || chapter._id.toString();
    
    // Remove status field from chapter (no locked/unlocked system)
    if (chapter.status) {
      delete chapter.status;
    }
    
    // Fetch all topics for this chapter
    const allTopics = await Topic.collection.find(
      { chapterId },
      { projection: { content: 0 } } // Exclude content field
    ).toArray();
    
    // Filter topics based on user unlock status
    let topics = allTopics;
    if (userId) {
      // Only return unlocked topics for this user
      topics = allTopics.filter(topic => {
        const topicId = topic.id || (topic._id ? topic._id.toString() : null);
        // Check if this topic is unlocked for the user
        return topicId && unlockedTopicIds.has(topicId.toString());
      });
    }
    
    // Remove status field from each topic and add unlocked status
    topics = topics.map(topic => {
      const topicId = topic.id || (topic._id ? topic._id.toString() : null);
      const topicCopy = { ...topic };
      
      // Remove status field (no locked/unlocked system in DB)
      if (topicCopy.status) {
        delete topicCopy.status;
      }
      
      // Add status based on user unlock (always unlocked if userId not provided)
      topicCopy.status = userId ? 'unlocked' : 'unlocked';
      
      return topicCopy;
    });
    
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
        // Fetch all connected data (no userId for create endpoint)
        const bookWithConnections = await fetchBookWithConnections(existingBook, null);
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
    
    // Fetch all connected data (no userId for create endpoint)
    const bookWithConnections = await fetchBookWithConnections(book, null);
    
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
        const bookWithConnections = await fetchBookWithConnections(existingBook, null);
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
 * GET /api/books/:id?userId=xxx (optional userId to filter unlocked topics)
 */
const getBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.query.userId || req.query.user || req.query.id;

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

    // Fetch all connected data (chapters and topics) with user filter if userId provided
    const bookWithConnections = await fetchBookWithConnections(book, userId);

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
 * GET /api/books?userId=xxx (optional userId to filter unlocked topics)
 */
const getAllBooks = async (req, res) => {
  try {
    const userId = req.query.userId || req.query.user || req.query.id;
    
    const books = await Book.find({}).sort({ createdAt: -1 }).lean();

    // For each book, fetch all connected data (with user filter if userId provided)
    for (const book of books) {
      await fetchBookWithConnections(book, userId);
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

    // Fetch book with all connections (no userId for update endpoint)
    const bookWithConnections = await fetchBookWithConnections(updatedBook, null);

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
