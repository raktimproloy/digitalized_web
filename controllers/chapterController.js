const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const Topic = require('../models/Topic');
const mongoose = require('mongoose');

/**
 * Helper function to fetch chapter with all connected data (book and topics)
 */
const fetchChapterWithConnections = async (chapter) => {
  const chapterId = chapter.id || chapter._id.toString();
  const bookId = chapter.bookId;
  
  // Fetch book data
  let book = null;
  if (bookId) {
    book = await Book.collection.findOne({ id: bookId });
    if (!book) {
      book = await Book.collection.findOne({ _id: bookId });
    }
  }
  chapter.book = book;
  
  // Fetch all topics for this chapter
  const topics = await Topic.collection.find({ chapterId }).toArray();
  chapter.topics = topics;
  
  return chapter;
};

/**
 * Create a new chapter (with bookId)
 * POST /api/chapters
 */
const createChapter = async (req, res) => {
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
    
    // Accept single chapter object directly
    const chapterData = { ...req.body };
    
    // Validate bookId is provided
    if (!chapterData.bookId) {
      return res.status(400).json({
        success: false,
        error: 'bookId is required',
      });
    }
    
    // Check if chapter already exists by id
    if (chapterData.id) {
      const existingChapter = await Chapter.collection.findOne({ id: chapterData.id });
      if (existingChapter) {
        // Fetch all connected data
        const chapterWithConnections = await fetchChapterWithConnections(existingChapter);
        return res.status(200).json({
          success: true,
          message: 'Chapter already exists',
          data: [chapterWithConnections],
        });
      }
    }
    
    // Add timestamps if not provided
    const now = new Date();
    if (!chapterData.createdAt) chapterData.createdAt = now;
    if (!chapterData.updatedAt) chapterData.updatedAt = now;
    
    // Insert chapter directly into collection (no validation)
    const chapterResult = await Chapter.collection.insertOne(chapterData);
    
    // Fetch the created chapter
    let chapter = await Chapter.collection.findOne({ _id: chapterResult.insertedId });
    
    // Fetch all connected data
    const chapterWithConnections = await fetchChapterWithConnections(chapter);
    
    res.status(201).json({
      success: true,
      message: 'Chapter created successfully',
      data: [chapterWithConnections],
    });
  } catch (error) {
    // Log the full error for debugging
    console.error('Error creating chapter:', error);
    console.error('Error stack:', error.stack);
    
    // Handle duplicate key error - find and return existing document
    if (error.code === 11000) {
      let existingChapter = null;
      
      // Try to find by id if it was in the request
      if (req.body.id) {
        existingChapter = await Chapter.collection.findOne({ id: req.body.id });
      }
      
      // If we found the existing chapter, return success with it
      if (existingChapter) {
        const chapterWithConnections = await fetchChapterWithConnections(existingChapter);
        return res.status(200).json({
          success: true,
          message: 'Chapter already exists',
          data: [chapterWithConnections],
        });
      }
      
      // If we couldn't find it, return generic duplicate error
      return res.status(200).json({
        success: true,
        message: 'Chapter already exists',
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
 * Get chapter by id with all connected data (book and topics)
 * GET /api/chapters/:id
 */
const getChapter = async (req, res) => {
  try {
    const chapterId = req.params.id;

    if (!chapterId) {
      return res.status(400).json({
        success: false,
        error: 'Chapter id is required',
      });
    }

    // Find chapter by id field or _id
    let chapter = await Chapter.collection.findOne({ id: chapterId });
    if (!chapter) {
      chapter = await Chapter.collection.findOne({ _id: chapterId });
    }

    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found',
      });
    }

    // Fetch all connected data (book and topics)
    const chapterWithConnections = await fetchChapterWithConnections(chapter);

    res.status(200).json({
      success: true,
      data: [chapterWithConnections],
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
 * Get all chapters with all connected data
 * GET /api/chapters
 */
const getAllChapters = async (req, res) => {
  try {
    const chapters = await Chapter.collection.find({}).sort({ createdAt: -1 }).toArray();

    // For each chapter, fetch all connected data
    for (const chapter of chapters) {
      await fetchChapterWithConnections(chapter);
    }

    res.status(200).json({
      success: true,
      count: chapters.length,
      data: chapters,
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
 * Update chapter by id
 * PUT /api/chapters/:id
 * PATCH /api/chapters/:id
 */
const updateChapter = async (req, res) => {
  try {
    const chapterId = req.params.id;

    if (!chapterId) {
      return res.status(400).json({
        success: false,
        error: 'Chapter id is required',
      });
    }

    // Find chapter
    let chapter = await Chapter.collection.findOne({ id: chapterId });
    if (!chapter) {
      chapter = await Chapter.collection.findOne({ _id: chapterId });
    }

    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found',
      });
    }

    // Update chapter
    const updateData = { ...req.body };
    const now = new Date();
    updateData.updatedAt = now;

    const updatedChapter = await Chapter.collection.findOneAndUpdate(
      { _id: chapter._id },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    // Fetch chapter with all connections
    const chapterWithConnections = await fetchChapterWithConnections(updatedChapter);

    res.status(200).json({
      success: true,
      message: 'Chapter updated successfully',
      data: [chapterWithConnections],
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
  createChapter,
  getChapter,
  getAllChapters,
  updateChapter,
};

