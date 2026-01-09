const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const Topic = require('../models/Topic');
const UserTopicUnlock = require('../models/UserTopicUnlock');
const UserTopicPoint = require('../models/UserTopicPoint');
const UserChapterClick = require('../models/UserChapterClick');
const mongoose = require('mongoose');

/**
 * Helper function to fetch book with all connected data (chapters and topics)
 * Note: Topic content is excluded to reduce response size
 * Returns ALL topics with proper locked/unlocked status
 * - First topic of each chapter is automatically unlocked
 * - Other topics are unlocked only if user has unlocked them
 */
const fetchBookWithConnections = async (book, userId = null) => {
  const bookId = book.id || book._id.toString();
  
  // Fetch all chapters for this book, sorted by order then createdAt
  const chapters = await Chapter.collection.find({ bookId })
    .sort({ order: 1, createdAt: 1 })
    .toArray();
  
  // Get unlocked topic IDs for this user if userId is provided
  let unlockedTopicIds = new Set();
  let topicPointsMap = new Map(); // Map to store points for each topic
  let recentChapterId = null; // Store recent chapter ID for this book
  
  if (userId) {
    const unlocks = await UserTopicUnlock.find({ userId }).lean();
    unlocks.forEach(unlock => {
      // Store topicId (this is the field we use to track unlocks)
      const topicId = unlock.topicId;
      if (topicId) {
        unlockedTopicIds.add(topicId.toString());
      }
    });

    // Get all points for this user's topics
    const points = await UserTopicPoint.find({ userId }).lean();
    points.forEach(pointRecord => {
      const topicId = pointRecord.topicId;
      if (topicId) {
        topicPointsMap.set(topicId.toString(), pointRecord.point || 0);
      }
    });
    
    // Get recent chapter click for this book
    const chapterClick = await UserChapterClick.findOne({
      userId: userId.toString(),
      bookId: bookId,
    }).lean();
    
    if (chapterClick) {
      recentChapterId = chapterClick.chapterId;
    }
  }
  
  // For each chapter, fetch its topics (excluding content field)
  for (const chapter of chapters) {
    const chapterId = chapter.id || chapter._id.toString();
    
    // Remove status field from chapter (no locked/unlocked system)
    if (chapter.status) {
      delete chapter.status;
    }
    
    // Fetch all topics for this chapter, sorted by order then createdAt
    const allTopics = await Topic.collection.find(
      { chapterId },
      { projection: { content: 0 } } // Exclude content field
    )
    .sort({ order: 1, createdAt: 1 })
    .toArray();
    
    // Process all topics and set their locked/unlocked status and points
    const topics = allTopics.map((topic, index) => {
      const topicId = topic.id || (topic._id ? topic._id.toString() : null);
      const topicCopy = { ...topic };
      
      // Remove status field (no locked/unlocked system in DB)
      if (topicCopy.status) {
        delete topicCopy.status;
      }
      
      // Determine topic status
      if (!userId) {
        // If no userId provided, all topics are unlocked
        topicCopy.status = 'unlocked';
        topicCopy.point = 0;
      } else {
        // First topic (index 0) of each chapter is automatically unlocked
        if (index === 0) {
          topicCopy.status = 'unlocked';
        } else {
          // Other topics are unlocked only if user has unlocked them
          // Check both id and _id formats to match what's stored in UserTopicUnlock
          const isUnlocked = topicId && (
            unlockedTopicIds.has(topicId.toString()) ||
            (topic._id && unlockedTopicIds.has(topic._id.toString()))
          );
          topicCopy.status = isUnlocked ? 'unlocked' : 'locked';
        }
        
        // Add point data for this topic
        const point = topicPointsMap.get(topicId.toString()) || 
                     (topic._id ? topicPointsMap.get(topic._id.toString()) : null) || 0;
        topicCopy.point = point;
      }
      
      return topicCopy;
    });
    
    chapter.topics = topics;
  }
  
  // Add roadmap (chapters with topics) to book
  book.roadmap = chapters;
  
  // Add recent chapter ID if available
  if (recentChapterId) {
    book.recentChapterId = recentChapterId;
  }
  
  return book;
};

/**
 * Create a new book (only book data, no chapters/topics)
 * POST /api/books
 */
const createBook = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    
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
  fetchBookWithConnections,
};
