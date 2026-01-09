const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const Topic = require('../models/Topic');
const UserNote = require('../models/UserNote');
const UserTopicUnlock = require('../models/UserTopicUnlock');
const UserTopicPoint = require('../models/UserTopicPoint');
const TopicShare = require('../models/TopicShare');
const User = require('../models/User');
const mongoose = require('mongoose');

// Import fetchBookWithConnections from bookController
const { fetchBookWithConnections } = require('./bookController');

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
    let sharedInfo = null;
    
    if (userId) {
      userNotes = await loadUserNotes(userId, topicId);
      
      // Get shared info: who I shared with and who shared with me
      const finalTopicId = topic.id || topic._id.toString();
      
      // Get shares where I am the owner (who can see my notes)
      const myShares = await TopicShare.find({
        ownerId: userId.toString(),
        topicId: finalTopicId,
      }).lean();
      
      // Get shares where I am the recipient (who shared this with me)
      const sharedWithMe = await TopicShare.find({
        sharedWithUserId: userId.toString(),
        topicId: finalTopicId,
      }).lean();
      
      // Get user info for shares
      const sharedWithUsers = await Promise.all(
        myShares.map(async (share) => {
          const userQuery = [
            { _id: share.sharedWithUserId }, // Try _id as string first (for custom string IDs)
            { id: share.sharedWithUserId },
            { phoneNumber: share.sharedWithUserId },
          ];
          // Add ObjectId query if it's a valid ObjectId
          if (mongoose.Types.ObjectId.isValid(share.sharedWithUserId)) {
            userQuery.unshift({ _id: new mongoose.Types.ObjectId(share.sharedWithUserId) });
          }
          
          const user = await User.collection.findOne({ $or: userQuery });
          return {
            userId: share.sharedWithUserId,
            name: user?.name || null,
            phoneNumber: user?.phoneNumber || null,
            email: user?.email || null,
            sharedAt: share.sharedAt,
            shareId: share._id.toString(),
          };
        })
      );
      
      const sharedByUsers = await Promise.all(
        sharedWithMe.map(async (share) => {
          const userQuery = [
            { _id: share.ownerId }, // Try _id as string first (for custom string IDs)
            { id: share.ownerId },
            { phoneNumber: share.ownerId },
          ];
          // Add ObjectId query if it's a valid ObjectId
          if (mongoose.Types.ObjectId.isValid(share.ownerId)) {
            userQuery.unshift({ _id: new mongoose.Types.ObjectId(share.ownerId) });
          }
          
          const user = await User.collection.findOne({ $or: userQuery });
          return {
            userId: share.ownerId,
            name: user?.name || null,
            phoneNumber: user?.phoneNumber || null,
            email: user?.email || null,
            sharedAt: share.sharedAt,
            shareId: share._id.toString(),
          };
        })
      );
      
      sharedInfo = {
        sharedWith: sharedWithUsers, // Users I shared this topic with (who can see my notes)
        sharedBy: sharedByUsers, // Users who shared this topic with me
      };
    }

    // Return topic with user notes and shared info if userId was provided
    const response = {
      success: true,
      data: [topicWithConnections],
    };

    if (userId) {
      response.userNotes = userNotes;
      response.userId = userId;
      response.topicId = topicId;
      response.sharedInfo = sharedInfo;
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
    const topics = await Topic.collection.find({}).sort({ order: 1, createdAt: 1 }).toArray();

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
 * Unlock next topic for a user and store points for current topic
 * POST /api/topics/:id/unlock
 * Body: { userId: "xxx", point: 10 }
 * - Stores point with current topic and user
 * - Unlocks the NEXT topic in the same chapter
 */
const unlockTopicForUser = async (req, res) => {
  try {
    const currentTopicId = req.params.id;
    const userId = req.body.userId || req.query.userId;
    const point = req.body.point || req.query.point || 0;

    if (!currentTopicId) {
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

    // Find current topic
    let currentTopic = await Topic.collection.findOne({ id: currentTopicId });
    if (!currentTopic) {
      if (mongoose.Types.ObjectId.isValid(currentTopicId)) {
        currentTopic = await Topic.collection.findOne({ _id: new mongoose.Types.ObjectId(currentTopicId) });
      }
    }

    if (!currentTopic) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found',
      });
    }

    const finalCurrentTopicId = currentTopic.id || currentTopic._id.toString();
    const chapterId = currentTopic.chapterId;
    const bookId = currentTopic.bookId;

    // Store point for current topic
    let pointRecord = null;
    if (point > 0) {
      pointRecord = await UserTopicPoint.findOneAndUpdate(
        { userId, topicId: finalCurrentTopicId },
        { 
          userId, 
          topicId: finalCurrentTopicId,
          chapterId: chapterId,
          point: point,
          earnedAt: new Date() 
        },
        { upsert: true, new: true }
      );
    }

    // Find next topic in the same chapter
    // Get all topics in the chapter sorted by order
    const allTopics = await Topic.collection.find({ chapterId })
      .sort({ order: 1, createdAt: 1 })
      .toArray();

    // Find current topic index
    const currentIndex = allTopics.findIndex(t => 
      (t.id && t.id.toString() === finalCurrentTopicId.toString()) ||
      (t._id && t._id.toString() === finalCurrentTopicId.toString())
    );

    let nextTopic = null;
    let nextUnlock = null;

    if (currentIndex >= 0 && currentIndex < allTopics.length - 1) {
      // Get next topic
      nextTopic = allTopics[currentIndex + 1];
      const nextTopicId = nextTopic.id || nextTopic._id.toString();

      // Unlock the next topic
      nextUnlock = await UserTopicUnlock.findOneAndUpdate(
        { userId, topicId: nextTopicId },
        { userId, topicId: nextTopicId, unlockedAt: new Date() },
        { upsert: true, new: true }
      );
    }

    // Get the book associated with this topic
    let book = null;
    if (bookId) {
      book = await Book.collection.findOne({ id: bookId });
      if (!book) {
        if (mongoose.Types.ObjectId.isValid(bookId)) {
          book = await Book.collection.findOne({ _id: new mongoose.Types.ObjectId(bookId) });
        }
      }
    }

    // If book not found by bookId, try to find it through chapter
    if (!book && chapterId) {
      let chapter = await Chapter.collection.findOne({ id: chapterId });
      if (!chapter && mongoose.Types.ObjectId.isValid(chapterId)) {
        chapter = await Chapter.collection.findOne({ _id: new mongoose.Types.ObjectId(chapterId) });
      }
      
      if (chapter && chapter.bookId) {
        book = await Book.collection.findOne({ id: chapter.bookId });
        if (!book && mongoose.Types.ObjectId.isValid(chapter.bookId)) {
          book = await Book.collection.findOne({ _id: new mongoose.Types.ObjectId(chapter.bookId) });
        }
      }
    }

    if (!book) {
      return res.status(404).json({
        success: false,
        error: 'Book not found for this topic',
      });
    }

    // Fetch book with all connections (same as /api/books?userId=xxx)
    const bookWithConnections = await fetchBookWithConnections(book, userId);

    // Return same format as /api/books?userId=xxx
    res.status(200).json({
      success: true,
      message: 'Point stored and next topic unlocked successfully',
      data: [bookWithConnections],
    });
  } catch (error) {
    console.error('Error in unlockTopicForUser:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * Get point count for a user by chapter
 * GET /api/topics/points?userId=xxx&chapterId=xxx
 * Returns total points for the user in the specified chapter
 */
const getUserChapterPoints = async (req, res) => {
  try {
    const userId = req.query.userId || req.query.user || req.query.id;
    const chapterId = req.query.chapterId || req.query.chapter;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User id is required',
      });
    }

    if (!chapterId) {
      return res.status(400).json({
        success: false,
        error: 'Chapter id is required',
      });
    }

    // Get all points for this user in this chapter
    const points = await UserTopicPoint.find({ userId, chapterId }).lean();

    // Calculate total points
    const totalPoints = points.reduce((sum, p) => sum + (p.point || 0), 0);

    // Get topic details for each point
    const pointsWithTopics = await Promise.all(
      points.map(async (pointRecord) => {
        let topic = await Topic.collection.findOne({ id: pointRecord.topicId });
        if (!topic) {
          if (mongoose.Types.ObjectId.isValid(pointRecord.topicId)) {
            topic = await Topic.collection.findOne({ _id: new mongoose.Types.ObjectId(pointRecord.topicId) });
          }
        }
        return {
          topicId: pointRecord.topicId,
          point: pointRecord.point,
          earnedAt: pointRecord.earnedAt,
          topicName: topic ? (topic.name || topic.title) : null
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        userId,
        chapterId,
        totalPoints,
        points: pointsWithTopics,
        count: points.length
      },
    });
  } catch (error) {
    console.error('Error in getUserChapterPoints:', error);
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
  getUserChapterPoints,
};

