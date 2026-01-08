const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const Topic = require('../models/Topic');
const UserNote = require('../models/UserNote');
const UserTopicUnlock = require('../models/UserTopicUnlock');
const mongoose = require('mongoose');

/**
 * Helper function to fetch topic with all connected data (chapter and book)
 */
const fetchTopicWithConnections = async (topic) => {
  const topicId = topic.id || topic._id.toString();
  const chapterId = topic.chapterId;
  const bookId = topic.bookId;
  
  // Fetch chapter data
  let chapter = null;
  if (chapterId) {
    chapter = await Chapter.collection.findOne({ id: chapterId });
    if (!chapter) {
      chapter = await Chapter.collection.findOne({ _id: chapterId });
    }
  }
  topic.chapter = chapter;
  
  // Fetch book data
  let book = null;
  if (bookId) {
    book = await Book.collection.findOne({ id: bookId });
    if (!book) {
      book = await Book.collection.findOne({ _id: bookId });
    }
  }
  topic.book = book;
  
  return topic;
};

/**
 * Create a new topic (with bookId and chapterId)
 * POST /api/topics
 */
const createTopic = async (req, res) => {
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
    
    // Accept single topic object directly
    const topicData = { ...req.body };
    
    // Validate bookId and chapterId are provided
    if (!topicData.bookId) {
      return res.status(400).json({
        success: false,
        error: 'bookId is required',
      });
    }
    
    if (!topicData.chapterId) {
      return res.status(400).json({
        success: false,
        error: 'chapterId is required',
      });
    }
    
    // Check if topic already exists by id
    if (topicData.id) {
      const existingTopic = await Topic.collection.findOne({ id: topicData.id });
      if (existingTopic) {
        // Fetch all connected data
        const topicWithConnections = await fetchTopicWithConnections(existingTopic);
        return res.status(200).json({
          success: true,
          message: 'Topic already exists',
          data: [topicWithConnections],
        });
      }
    }
    
    // Add timestamps if not provided
    const now = new Date();
    if (!topicData.createdAt) topicData.createdAt = now;
    if (!topicData.updatedAt) topicData.updatedAt = now;
    
    // Insert topic directly into collection (no validation)
    const topicResult = await Topic.collection.insertOne(topicData);
    
    // Fetch the created topic
    let topic = await Topic.collection.findOne({ _id: topicResult.insertedId });
    
    // Fetch all connected data
    const topicWithConnections = await fetchTopicWithConnections(topic);
    
    res.status(201).json({
      success: true,
      message: 'Topic created successfully',
      data: [topicWithConnections],
    });
  } catch (error) {
    // Log the full error for debugging
    console.error('Error creating topic:', error);
    console.error('Error stack:', error.stack);
    
    // Handle duplicate key error - find and return existing document
    if (error.code === 11000) {
      let existingTopic = null;
      
      // Try to find by id if it was in the request
      if (req.body.id) {
        existingTopic = await Topic.collection.findOne({ id: req.body.id });
      }
      
      // If we found the existing topic, return success with it
      if (existingTopic) {
        const topicWithConnections = await fetchTopicWithConnections(existingTopic);
        return res.status(200).json({
          success: true,
          message: 'Topic already exists',
          data: [topicWithConnections],
        });
      }
      
      // If we couldn't find it, return generic duplicate error
      return res.status(200).json({
        success: true,
        message: 'Topic already exists',
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
 * Helper function to load user notes from MongoDB
 */
const loadUserNotes = async (userId, topicId) => {
  try {
    const query = { userId: userId };
    if (topicId) {
      query.topicId = topicId;
    }
    const notes = await UserNote.find(query).lean();
    
    // Map MongoDB _id to id for compatibility with frontend code
    // Preserve original id field if it exists, otherwise use _id
    const mappedNotes = (notes || []).map(note => {
      const mapped = { ...note };
      // If note has _id but no id field, use _id as id
      // Otherwise, preserve the existing id field
      if (mapped._id && !mapped.id) {
        mapped.id = mapped._id.toString();
      }
      // Keep _id for reference but frontend will use id
      return mapped;
    });
    
    return mappedNotes;
  } catch (error) {
    console.error('Error loading user notes:', error);
    return [];
  }
};

/**
 * Get topic by id with all connected data (chapter and book)
 * Optionally includes user notes if userId is provided in query
 * GET /api/topics/:id?userId=xxx
 */
const getTopic = async (req, res) => {
  try {
    const topicId = req.params.id;
    const userId = req.query.userId || req.query.user || req.query.id;

    if (!topicId) {
      return res.status(400).json({
        success: false,
        error: 'Topic id is required',
      });
    }

    // Find topic by id field or _id
    let topic = await Topic.collection.findOne({ id: topicId });
    if (!topic) {
      // Check if topicId is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(topicId)) {
        topic = await Topic.collection.findOne({ _id: new mongoose.Types.ObjectId(topicId) });
      }
    }

    if (!topic) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found',
      });
    }

    // Fetch all connected data (chapter and book)
    const topicWithConnections = await fetchTopicWithConnections(topic);

    // If userId is provided, also fetch user notes for this topic
    let userNotes = [];
    if (userId) {
      userNotes = await loadUserNotes(userId, topicId);
    }

    // Return topic with user notes if userId was provided
    const response = {
      success: true,
      data: [topicWithConnections],
    };

    if (userId) {
      response.userNotes = userNotes;
      response.userId = userId;
      response.topicId = topicId;
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * Get all topics with all connected data
 * GET /api/topics
 */
const getAllTopics = async (req, res) => {
  try {
    const topics = await Topic.collection.find({}).sort({ createdAt: -1 }).toArray();

    // For each topic, fetch all connected data
    for (const topic of topics) {
      await fetchTopicWithConnections(topic);
    }

    res.status(200).json({
      success: true,
      count: topics.length,
      data: topics,
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
 * Update topic by id
 * PUT /api/topics/:id
 * PATCH /api/topics/:id
 */
const updateTopic = async (req, res) => {
  try {
    const topicId = req.params.id;

    if (!topicId) {
      return res.status(400).json({
        success: false,
        error: 'Topic id is required',
      });
    }

    // Find topic
    let topic = await Topic.collection.findOne({ id: topicId });
    if (!topic) {
      topic = await Topic.collection.findOne({ _id: topicId });
    }

    if (!topic) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found',
      });
    }

    // Update topic
    const updateData = { ...req.body };
    const now = new Date();
    updateData.updatedAt = now;

    const updatedTopic = await Topic.collection.findOneAndUpdate(
      { _id: topic._id },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    // Fetch topic with all connections
    const topicWithConnections = await fetchTopicWithConnections(updatedTopic);

    res.status(200).json({
      success: true,
      message: 'Topic updated successfully',
      data: [topicWithConnections],
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
 * Unlock a topic for a user
 * POST /api/topics/:id/unlock
 * Body: { userId: "xxx" }
 */
const unlockTopicForUser = async (req, res) => {
  try {
    const topicId = req.params.id;
    const userId = req.body.userId || req.query.userId;

    if (!topicId) {
      return res.status(400).json({
        success: false,
        error: 'Topic id is required',
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User id is required',
      });
    }

    // Check if topic exists
    let topic = await Topic.collection.findOne({ id: topicId });
    if (!topic) {
      if (mongoose.Types.ObjectId.isValid(topicId)) {
        topic = await Topic.collection.findOne({ _id: new mongoose.Types.ObjectId(topicId) });
      }
    }

    if (!topic) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found',
      });
    }

    // Use the topicId from params (could be id or _id)
    const finalTopicId = topic.id || topic._id.toString();

    // Create or update unlock record
    const unlock = await UserTopicUnlock.findOneAndUpdate(
      { userId, topicId: finalTopicId },
      { userId, topicId: finalTopicId, unlockedAt: new Date() },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Topic unlocked successfully',
      data: unlock,
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
  createTopic,
  getTopic,
  getAllTopics,
  updateTopic,
  unlockTopicForUser,
};

