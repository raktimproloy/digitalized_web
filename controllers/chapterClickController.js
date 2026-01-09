const UserChapterClick = require('../models/UserChapterClick');
const Chapter = require('../models/Chapter');
const Book = require('../models/Book');
const mongoose = require('mongoose');

/**
 * Record a chapter click/view for a user
 * POST /api/chapter-click
 * Body: { userId: "xxx", bookId: "yyy", chapterId: "zzz" }
 */
const recordChapterClick = async (req, res) => {
  try {
    const { userId, bookId, chapterId } = req.body;
    
    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }
    
    if (!bookId) {
      return res.status(400).json({
        success: false,
        error: 'Book ID is required',
      });
    }
    
    if (!chapterId) {
      return res.status(400).json({
        success: false,
        error: 'Chapter ID is required',
      });
    }
    
    // Verify chapter exists and belongs to the book
    let chapter = await Chapter.collection.findOne({ id: chapterId });
    if (!chapter) {
      if (mongoose.Types.ObjectId.isValid(chapterId)) {
        chapter = await Chapter.collection.findOne({ _id: new mongoose.Types.ObjectId(chapterId) });
      }
    }
    
    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found',
      });
    }
    
    // Verify chapter belongs to the book
    const chapterBookId = chapter.bookId;
    if (chapterBookId !== bookId.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Chapter does not belong to the specified book',
      });
    }
    
    // Create or update the chapter click record
    const clickData = {
      userId: userId.toString(),
      bookId: bookId.toString(),
      chapterId: chapterId.toString(),
      clickedAt: new Date(),
    };
    
    const clickRecord = await UserChapterClick.findOneAndUpdate(
      {
        userId: clickData.userId,
        bookId: clickData.bookId,
      },
      clickData,
      {
        upsert: true,
        new: true,
      }
    );
    
    res.status(200).json({
      success: true,
      message: 'Chapter click recorded successfully',
      data: {
        id: clickRecord._id.toString(),
        userId: clickRecord.userId,
        bookId: clickRecord.bookId,
        chapterId: clickRecord.chapterId,
        clickedAt: clickRecord.clickedAt,
        createdAt: clickRecord.createdAt,
        updatedAt: clickRecord.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error recording chapter click:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * Get recent chapter clicks for a user
 * GET /api/chapter-click?userId=xxx
 */
const getUserChapterClicks = async (req, res) => {
  try {
    const userId = req.query.userId || req.query.user || req.query.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }
    
    const clicks = await UserChapterClick.find({ userId: userId.toString() })
      .sort({ clickedAt: -1 })
      .lean();
    
    // Get chapter and book details for each click
    const clicksWithDetails = await Promise.all(
      clicks.map(async (click) => {
        // Get chapter details
        let chapter = await Chapter.collection.findOne({ id: click.chapterId });
        if (!chapter) {
          if (mongoose.Types.ObjectId.isValid(click.chapterId)) {
            chapter = await Chapter.collection.findOne({ _id: new mongoose.Types.ObjectId(click.chapterId) });
          }
        }
        
        // Get book details
        let book = await Book.collection.findOne({ id: click.bookId });
        if (!book) {
          if (mongoose.Types.ObjectId.isValid(click.bookId)) {
            book = await Book.collection.findOne({ _id: new mongoose.Types.ObjectId(click.bookId) });
          }
        }
        
        return {
          id: click._id.toString(),
          userId: click.userId,
          bookId: click.bookId,
          chapterId: click.chapterId,
          chapter: chapter || { id: click.chapterId, name: 'Chapter not found' },
          book: book || { id: click.bookId, name: 'Book not found' },
          clickedAt: click.clickedAt,
          createdAt: click.createdAt,
          updatedAt: click.updatedAt,
        };
      })
    );
    
    res.status(200).json({
      success: true,
      count: clicksWithDetails.length,
      data: clicksWithDetails,
    });
  } catch (error) {
    console.error('Error fetching chapter clicks:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
};

module.exports = {
  recordChapterClick,
  getUserChapterClicks,
};

