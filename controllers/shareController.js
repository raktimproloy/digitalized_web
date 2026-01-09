const User = require('../models/User');
const Topic = require('../models/Topic');
const Chapter = require('../models/Chapter');
const Book = require('../models/Book');
const TopicShare = require('../models/TopicShare');
const UserNote = require('../models/UserNote');
const mongoose = require('mongoose');

/**
 * Get all users with optional name search
 * GET /api/share/users?search=name
 */
const getAllUsers = async (req, res) => {
  try {
    const searchQuery = req.query.search || req.query.name || req.query.q;
    
    let query = {};
    
    // If search query provided, search in name field (case-insensitive)
    if (searchQuery) {
      query = {
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { phoneNumber: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } },
        ],
      };
    }

    console.log('searchQuery', searchQuery);
    console.log('query', query);
    
    const users = await User.find(query)
      .select('_id name phoneNumber email createdAt updatedAt')
      .sort({ name: 1, createdAt: -1 })
      .lean();
    
    // Format user data to include id field
    const formattedUsers = users.map(user => ({
      id: user._id ? user._id.toString() : null,
      _id: user._id,
      name: user.name || null,
      phoneNumber: user.phoneNumber || null,
      email: user.email || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
    
    res.status(200).json({
      success: true,
      count: formattedUsers.length,
      data: formattedUsers,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * Share a topic with a user
 * POST /api/share/topic
 * Body: { topicId: "xxx", sharedWithUserId: "yyy" }
 */
const shareTopic = async (req, res) => {
  try {
    const { topicId, sharedWithUserId } = req.body;
    const ownerId = req.body.ownerId || req.query.ownerId || req.query.userId;
    
    // Validation
    if (!topicId) {
      return res.status(400).json({
        success: false,
        error: 'Topic ID is required',
      });
    }
    
    if (!sharedWithUserId) {
      return res.status(400).json({
        success: false,
        error: 'Shared with user ID is required',
      });
    }
    
    if (!ownerId) {
      return res.status(400).json({
        success: false,
        error: 'Owner ID is required',
      });
    }
    
    // Prevent sharing with yourself
    if (ownerId === sharedWithUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot share topic with yourself',
      });
    }
    
    // Verify topic exists
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
    
    // Verify both users exist
    // Try multiple formats: _id (string), _id (ObjectId), custom id field, phoneNumber
    const ownerQuery = [
      { _id: ownerId }, // Try _id as string first (for custom string IDs)
      { id: ownerId },
      { phoneNumber: ownerId },
    ];
    // Add ObjectId query if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(ownerId)) {
      ownerQuery.unshift({ _id: new mongoose.Types.ObjectId(ownerId) });
    }
    
    const owner = await User.collection.findOne({ $or: ownerQuery });
    
    const sharedWithUserQuery = [
      { _id: sharedWithUserId }, // Try _id as string first (for custom string IDs)
      { id: sharedWithUserId },
      { phoneNumber: sharedWithUserId },
    ];
    // Add ObjectId query if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(sharedWithUserId)) {
      sharedWithUserQuery.unshift({ _id: new mongoose.Types.ObjectId(sharedWithUserId) });
    }
    
    const sharedWithUser = await User.collection.findOne({ $or: sharedWithUserQuery });
    
    if (!owner) {
      return res.status(404).json({
        success: false,
        error: 'Owner user not found',
      });
    }
    
    if (!sharedWithUser) {
      return res.status(404).json({
        success: false,
        error: 'Shared with user not found',
      });
    }
    
    // Get topic's chapterId and bookId
    const finalTopicId = topic.id || topic._id.toString();
    const chapterId = topic.chapterId;
    const bookId = topic.bookId;
    
    // Create or update share record
    const shareData = {
      ownerId: ownerId.toString(),
      sharedWithUserId: sharedWithUserId.toString(),
      topicId: finalTopicId,
      chapterId: chapterId || null,
      bookId: bookId || null,
      sharedAt: new Date(),
    };
    
    let shareRecord;
    try {
      shareRecord = await TopicShare.findOneAndUpdate(
        {
          ownerId: shareData.ownerId,
          sharedWithUserId: shareData.sharedWithUserId,
          topicId: shareData.topicId,
        },
        shareData,
        { upsert: true, new: true }
      );
    } catch (error) {
      // If duplicate key error, share already exists
      if (error.code === 11000) {
        shareRecord = await TopicShare.findOne({
          ownerId: shareData.ownerId,
          sharedWithUserId: shareData.sharedWithUserId,
          topicId: shareData.topicId,
        });
      } else {
        throw error;
      }
    }
    
    // Get user info for response
    const sharedWithUserInfo = {
      id: sharedWithUser._id ? sharedWithUser._id.toString() : sharedWithUser.id,
      name: sharedWithUser.name || null,
      phoneNumber: sharedWithUser.phoneNumber || null,
      email: sharedWithUser.email || null,
    };
    
    res.status(200).json({
      success: true,
      message: 'Topic shared successfully',
      data: {
        shareId: shareRecord._id.toString(),
        ownerId: shareRecord.ownerId,
        sharedWithUser: sharedWithUserInfo,
        topicId: shareRecord.topicId,
        chapterId: shareRecord.chapterId,
        bookId: shareRecord.bookId,
        sharedAt: shareRecord.sharedAt,
        createdAt: shareRecord.createdAt,
        updatedAt: shareRecord.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error sharing topic:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * Get all topics I shared with other users
 * GET /api/share/my-shares?userId=xxx
 * Returns: books > chapters > topics with user list info
 */
const getMyShares = async (req, res) => {
  try {
    const userId = req.query.userId || req.query.user || req.query.id || req.query.ownerId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }
    
    // Get all shares where I am the owner
    const shares = await TopicShare.find({ ownerId: userId.toString() })
      .sort({ createdAt: -1 })
      .lean();
    
    if (shares.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: 'No topics shared yet',
      });
    }
    
    // Group shares by bookId > chapterId > topicId
    const shareMap = new Map();
    
    for (const share of shares) {
      const bookId = share.bookId || 'unknown';
      const chapterId = share.chapterId || 'unknown';
      const topicId = share.topicId;
      
      if (!shareMap.has(bookId)) {
        shareMap.set(bookId, new Map());
      }
      
      const bookMap = shareMap.get(bookId);
      if (!bookMap.has(chapterId)) {
        bookMap.set(chapterId, new Map());
      }
      
      const chapterMap = bookMap.get(chapterId);
      if (!chapterMap.has(topicId)) {
        chapterMap.set(topicId, {
          topicId: topicId,
          sharedWithUsers: [],
        });
      }
      
      // Get shared with user info
      const sharedWithUserQuery = [
        { _id: share.sharedWithUserId }, // Try _id as string first (for custom string IDs)
        { id: share.sharedWithUserId },
        { phoneNumber: share.sharedWithUserId },
      ];
      // Add ObjectId query if it's a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(share.sharedWithUserId)) {
        sharedWithUserQuery.unshift({ _id: new mongoose.Types.ObjectId(share.sharedWithUserId) });
      }
      
      const sharedWithUser = await User.collection.findOne({ $or: sharedWithUserQuery });
      
      chapterMap.get(topicId).sharedWithUsers.push({
        userId: share.sharedWithUserId,
        name: sharedWithUser?.name || null,
        phoneNumber: sharedWithUser?.phoneNumber || null,
        email: sharedWithUser?.email || null,
        sharedAt: share.sharedAt,
        shareId: share._id.toString(),
      });
    }
    
    // Fetch book, chapter, and topic details
    const result = [];
    
    for (const [bookId, chapterMap] of shareMap) {
      let book = null;
      if (bookId !== 'unknown') {
        book = await Book.collection.findOne({ id: bookId });
        if (!book) {
          if (mongoose.Types.ObjectId.isValid(bookId)) {
            book = await Book.collection.findOne({ _id: new mongoose.Types.ObjectId(bookId) });
          }
        }
      }
      
      const chapters = [];
      
      for (const [chapterId, topicMap] of chapterMap) {
        let chapter = null;
        if (chapterId !== 'unknown') {
          chapter = await Chapter.collection.findOne({ id: chapterId });
          if (!chapter) {
            if (mongoose.Types.ObjectId.isValid(chapterId)) {
              chapter = await Chapter.collection.findOne({ _id: new mongoose.Types.ObjectId(chapterId) });
            }
          }
        }
        
        const topics = [];
        
        for (const [topicId, shareData] of topicMap) {
          let topic = await Topic.collection.findOne({ id: topicId });
          if (!topic) {
            if (mongoose.Types.ObjectId.isValid(topicId)) {
              topic = await Topic.collection.findOne({ _id: new mongoose.Types.ObjectId(topicId) });
            }
          }
          
          if (topic) {
            topics.push({
              ...topic,
              sharedWithUsers: shareData.sharedWithUsers,
            });
          }
        }
        
        if (chapter) {
          chapters.push({
            ...chapter,
            topics: topics,
          });
        } else {
          // If chapter not found, still include topics
          chapters.push({
            id: chapterId,
            name: 'Unknown Chapter',
            topics: topics,
          });
        }
      }
      
      if (book) {
        result.push({
          ...book,
          chapters: chapters,
        });
      } else {
        // If book not found, still include chapters
        result.push({
          id: bookId,
          name: 'Unknown Book',
          chapters: chapters,
        });
      }
    }
    
    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching my shares:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * Get all topics shared with me
 * GET /api/share/shared-with-me?userId=xxx
 * Returns: topics with full info including who shared them
 */
const getSharedWithMe = async (req, res) => {
  try {
    const userId = req.query.userId || req.query.user || req.query.id || req.query.sharedWithUserId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }
    
    // Get all shares where I am the recipient
    const shares = await TopicShare.find({ sharedWithUserId: userId.toString() })
      .sort({ createdAt: -1 })
      .lean();
    
    if (shares.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: 'No topics shared with you yet',
      });
    }
    
    // Fetch full details for each share
    const result = await Promise.all(
      shares.map(async (share) => {
        // Get topic details
        let topic = await Topic.collection.findOne({ id: share.topicId });
        if (!topic) {
          if (mongoose.Types.ObjectId.isValid(share.topicId)) {
            topic = await Topic.collection.findOne({ _id: new mongoose.Types.ObjectId(share.topicId) });
          }
        }
        
        // Get chapter details
        let chapter = null;
        if (share.chapterId) {
          chapter = await Chapter.collection.findOne({ id: share.chapterId });
          if (!chapter) {
            if (mongoose.Types.ObjectId.isValid(share.chapterId)) {
              chapter = await Chapter.collection.findOne({ _id: new mongoose.Types.ObjectId(share.chapterId) });
            }
          }
        }
        
        // Get book details
        let book = null;
        if (share.bookId) {
          book = await Book.collection.findOne({ id: share.bookId });
          if (!book) {
            if (mongoose.Types.ObjectId.isValid(share.bookId)) {
              book = await Book.collection.findOne({ _id: new mongoose.Types.ObjectId(share.bookId) });
            }
          }
        }
        
        // Get owner (who shared with me) details
        const ownerQuery = [
          { _id: share.ownerId }, // Try _id as string first (for custom string IDs)
          { id: share.ownerId },
          { phoneNumber: share.ownerId },
        ];
        // Add ObjectId query if it's a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(share.ownerId)) {
          ownerQuery.unshift({ _id: new mongoose.Types.ObjectId(share.ownerId) });
        }
        
        const owner = await User.collection.findOne({ $or: ownerQuery });
        
        return {
          shareId: share._id.toString(),
          topic: topic || { id: share.topicId, name: 'Topic not found' },
          chapter: chapter || (share.chapterId ? { id: share.chapterId, name: 'Chapter not found' } : null),
          book: book || (share.bookId ? { id: share.bookId, name: 'Book not found' } : null),
          sharedBy: {
            userId: share.ownerId,
            name: owner?.name || null,
            phoneNumber: owner?.phoneNumber || null,
            email: owner?.email || null,
          },
          sharedAt: share.sharedAt,
          createdAt: share.createdAt,
          updatedAt: share.updatedAt,
        };
      })
    );
    
    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching shared with me:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * Remove a share (can be called by owner or recipient)
 * DELETE /api/share/:shareId?userId=xxx
 * or
 * DELETE /api/share?topicId=xxx&sharedWithUserId=yyy&ownerId=zzz
 */
const removeShare = async (req, res) => {
  try {
    const shareId = req.params.shareId;
    const userId = req.query.userId || req.query.user || req.query.id;
    const { topicId, sharedWithUserId, ownerId } = req.query;
    
    let shareRecord = null;
    
    // If shareId provided, find by shareId
    if (shareId && shareId.trim() !== '') {
      shareRecord = await TopicShare.findById(shareId);
      
      if (!shareRecord) {
        return res.status(404).json({
          success: false,
          error: 'Share not found',
        });
      }
      
      // Verify user has permission (must be owner or recipient)
      if (userId) {
        const userIdStr = userId.toString();
        if (shareRecord.ownerId !== userIdStr && shareRecord.sharedWithUserId !== userIdStr) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to remove this share',
          });
        }
      }
    } else if (topicId && sharedWithUserId && ownerId) {
      // Find by topicId, sharedWithUserId, and ownerId
      shareRecord = await TopicShare.findOne({
        topicId: topicId.toString(),
        sharedWithUserId: sharedWithUserId.toString(),
        ownerId: ownerId.toString(),
      });
      
      if (!shareRecord) {
        return res.status(404).json({
          success: false,
          error: 'Share not found',
        });
      }
      
      // Verify user has permission
      if (userId) {
        const userIdStr = userId.toString();
        if (shareRecord.ownerId !== userIdStr && shareRecord.sharedWithUserId !== userIdStr) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to remove this share',
          });
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either shareId or (topicId, sharedWithUserId, ownerId) is required',
      });
    }
    
    // Delete the share
    await TopicShare.findByIdAndDelete(shareRecord._id);
    
    res.status(200).json({
      success: true,
      message: 'Share removed successfully',
      data: {
        shareId: shareRecord._id.toString(),
        topicId: shareRecord.topicId,
        ownerId: shareRecord.ownerId,
        sharedWithUserId: shareRecord.sharedWithUserId,
      },
    });
  } catch (error) {
    console.error('Error removing share:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
};

/**
 * Get shared topic notes - View the notes of the person who shared a topic with you
 * GET /api/share/shared-notes?topicId=xxx&userId=yyy
 * Returns: The owner's notes on the shared topic, along with owner info
 */
const getSharedTopicNotes = async (req, res) => {
  try {
    const topicId = req.query.topicId || req.params.topicId;
    const userId = req.query.userId || req.query.user || req.query.id || req.params.userId;
    
    if (!topicId) {
      return res.status(400).json({
        success: false,
        error: 'Topic ID is required',
      });
    }
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }
    
    // Find the share where this topic was shared with the user
    const share = await TopicShare.findOne({
      topicId: topicId.toString(),
      sharedWithUserId: userId.toString(),
    }).lean();
    
    if (!share) {
      return res.status(404).json({
        success: false,
        error: 'This topic has not been shared with you',
        message: 'No share record found for this topic and user',
      });
    }
    
    const ownerId = share.ownerId;
    
    // Get owner's user info
    const ownerQuery = [
      { _id: ownerId }, // Try _id as string first (for custom string IDs)
      { id: ownerId },
      { phoneNumber: ownerId },
    ];
    // Add ObjectId query if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(ownerId)) {
      ownerQuery.unshift({ _id: new mongoose.Types.ObjectId(ownerId) });
    }
    
    const owner = await User.collection.findOne({ $or: ownerQuery });
    
    if (!owner) {
      return res.status(404).json({
        success: false,
        error: 'Owner user not found',
      });
    }
    
    // Get owner's notes for this topic
    const notesQuery = { userId: ownerId.toString() };
    if (topicId) {
      notesQuery.topicId = topicId.toString();
    }
    
    const notes = await UserNote.find(notesQuery).lean();
    
    // Map MongoDB _id to id for compatibility with frontend code
    const mappedNotes = (notes || []).map(note => {
      const mapped = { ...note };
      // If note has _id but no id field, use _id as id
      if (mapped._id && !mapped.id) {
        mapped.id = mapped._id.toString();
      }
      return mapped;
    });
    
    // Get topic details
    let topic = await Topic.collection.findOne({ id: topicId });
    if (!topic) {
      if (mongoose.Types.ObjectId.isValid(topicId)) {
        topic = await Topic.collection.findOne({ _id: new mongoose.Types.ObjectId(topicId) });
      }
    }
    
    // Get chapter details if available
    let chapter = null;
    if (share.chapterId) {
      chapter = await Chapter.collection.findOne({ id: share.chapterId });
      if (!chapter) {
        if (mongoose.Types.ObjectId.isValid(share.chapterId)) {
          chapter = await Chapter.collection.findOne({ _id: new mongoose.Types.ObjectId(share.chapterId) });
        }
      }
    }
    
    // Get book details if available
    let book = null;
    if (share.bookId) {
      book = await Book.collection.findOne({ id: share.bookId });
      if (!book) {
        if (mongoose.Types.ObjectId.isValid(share.bookId)) {
          book = await Book.collection.findOne({ _id: new mongoose.Types.ObjectId(share.bookId) });
        }
      }
    }
    
    // Format owner info
    const ownerInfo = {
      userId: ownerId,
      name: owner?.name || null,
      phoneNumber: owner?.phoneNumber || null,
      email: owner?.email || null,
    };
    
    res.status(200).json({
      success: true,
      data: {
        shareId: share._id.toString(),
        topic: topic || { id: topicId, name: 'Topic not found' },
        chapter: chapter || (share.chapterId ? { id: share.chapterId, name: 'Chapter not found' } : null),
        book: book || (share.bookId ? { id: share.bookId, name: 'Book not found' } : null),
        sharedBy: ownerInfo,
        notes: mappedNotes,
        notesCount: mappedNotes.length,
        sharedAt: share.sharedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching shared topic notes:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  shareTopic,
  getMyShares,
  getSharedWithMe,
  removeShare,
  getSharedTopicNotes,
};

