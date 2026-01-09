require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Topic = require('./models/Topic');
const UserNote = require('./models/UserNote');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB - will be awaited before server starts

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set the views directory
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the public directory (optional)
app.use(express.static(path.join(__dirname, 'public')));

// Body parser middleware for handling form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// User API routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Book API routes
const bookRoutes = require('./routes/bookRoutes');
app.use('/api/books', bookRoutes);

// Chapter API routes
const chapterRoutes = require('./routes/chapterRoutes');
app.use('/api/chapters', chapterRoutes);

// Topic API routes
const topicRoutes = require('./routes/topicRoutes');
app.use('/api/topics', topicRoutes);

// Share API routes
const shareRoutes = require('./routes/shareRoutes');
app.use('/api/share', shareRoutes);

// Chapter Click API routes
const chapterClickRoutes = require('./routes/chapterClickRoutes');
app.use('/api/chapter-click', chapterClickRoutes);

// Load ebooks data
let ebooksData = {};
try {
  const ebooksFile = path.join(__dirname, 'data', 'ebooks.json');
  const fileContent = fs.readFileSync(ebooksFile, 'utf8');
  ebooksData = JSON.parse(fileContent);
} catch (error) {
  console.error('Error loading ebooks data:', error);
  ebooksData = {};
}

// Helper function to load user notes from MongoDB
async function loadUserNotes(userId, topicId) {
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
      // Don't delete _id as it might be needed for MongoDB operations
      return mapped;
    });
    
    return mappedNotes;
  } catch (error) {
    console.error('Error loading user notes:', error);
    return [];
  }
}

// Helper function to save user notes to MongoDB
async function saveUserNotes(notes, userId, topicId) {
  try {
    if (!Array.isArray(notes)) {
      return false;
    }

    // Delete existing notes for this userId and topicId
    const deleteQuery = { userId: userId };
    if (topicId) {
      deleteQuery.topicId = topicId;
    }
    await UserNote.deleteMany(deleteQuery);

    // Insert new notes
    if (notes.length > 0) {
      const notesToInsert = notes.map(note => {
        const noteData = { ...note };
        // Ensure id field is preserved (don't let MongoDB overwrite it)
        // If note has both _id and id, preserve id and remove _id to avoid conflicts
        if (noteData._id && noteData.id && noteData._id.toString() !== noteData.id) {
          // Keep the original id, remove _id so MongoDB creates a new one
          delete noteData._id;
        }
        // Add userId and topicId
        noteData.userId = userId;
        noteData.topicId = topicId || null;
        return noteData;
      });
      await UserNote.insertMany(notesToInsert);
    }

    return true;
  } catch (error) {
    console.error('Error saving user notes:', error);
    return false;
  }
}

// Ebook route - accepts user ID or topic ID as query parameter
app.get('/ebook', async (req, res) => {
  const userId = req.query.user || req.query.id || req.query.userId;
  const topicId = req.query.topicId || req.query.topic;
  const sharedId = req.query.sharedId || req.query.shareId;
  
  // If sharedId is provided, fetch and display shared topic notes
  if (sharedId && topicId) {
    try {
      // Import TopicShare model
      const TopicShare = require('./models/TopicShare');
      
      // Find the share record
      const share = await TopicShare.findById(sharedId).lean();
      
      if (!share) {
        return res.status(404).send(`Share not found for ID: ${sharedId}`);
      }
      
      // Verify the topicId matches
      if (share.topicId !== topicId.toString()) {
        return res.status(400).send('Topic ID does not match the share record');
      }
      
      // Find topic by id field first
      let topic = await Topic.findOne({ id: topicId }).lean();
      
      // If not found, try MongoDB _id
      if (!topic) {
        // Check if topicId is a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(topicId)) {
          topic = await Topic.findById(topicId).lean();
        }
      }
      
      if (!topic) {
        return res.status(404).send(`No topic found for ID: ${topicId}`);
      }
      
      // Fetch shared notes directly
      const User = require('./models/User');
      const Chapter = require('./models/Chapter');
      const Book = require('./models/Book');
      
      const ownerId = share.ownerId;
      
      // Get owner's user info
      const ownerQuery = [
        { _id: ownerId },
        { id: ownerId },
        { phoneNumber: ownerId },
      ];
      if (mongoose.Types.ObjectId.isValid(ownerId)) {
        ownerQuery.unshift({ _id: new mongoose.Types.ObjectId(ownerId) });
      }
      
      const owner = await User.collection.findOne({ $or: ownerQuery });
      
      if (!owner) {
        return res.status(404).send(`Owner user not found for share ID: ${sharedId}`);
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
        if (mapped._id && !mapped.id) {
          mapped.id = mapped._id.toString();
        }
        return mapped;
      });
      
      // Format owner info
      const ownerInfo = {
        userId: ownerId,
        name: owner?.name || null,
        phoneNumber: owner?.phoneNumber || null,
        email: owner?.email || null,
      };
      
      // Create ebook-like structure for topic
      const topicEbook = {
        title: topic.name || topic.title || 'Topic',
        content: topic.content || '',
        chapters: [],
        notes: {}
      };
      
      res.render('ebook', {
        ebook: topicEbook,
        userId: share.sharedWithUserId, // The recipient's ID
        userNotes: mappedNotes, // Owner's notes
        isTopic: true,
        topicId: topicId,
        isSharedView: true,
        sharedId: sharedId,
        sharedBy: ownerInfo,
        shareInfo: {
          shareId: share._id.toString(),
          sharedAt: share.sharedAt,
          sharedBy: ownerInfo
        }
      });
      return;
    } catch (error) {
      console.error('Error fetching shared topic:', error);
      // Fall through to regular topic view
    }
  }
  
  // If topicId is provided, fetch and display topic content
  if (topicId) {
    try {
      // Find topic by id field first
      let topic = await Topic.findOne({ id: topicId }).lean();
      
      // If not found, try MongoDB _id
      if (!topic) {
        // Check if topicId is a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(topicId)) {
          topic = await Topic.findById(topicId).lean();
        }
      }
      
      if (!topic) {
        return res.status(404).send(`No topic found for ID: ${topicId}`);
      }
      
      // Get userId from query parameter
      const noteUserId = userId || topic.userId || topicId;
      
      // Load user notes from MongoDB
      const notes = await loadUserNotes(noteUserId, topicId);
      
      // Create ebook-like structure for topic
      const topicEbook = {
        title: topic.name || topic.title || 'Topic',
        content: topic.content || '',
        chapters: [],
        notes: {}
      };
      
      res.render('ebook', {
        ebook: topicEbook,
        userId: noteUserId,
        userNotes: notes,
        isTopic: true,
        topicId: topicId
      });
      return;
    } catch (error) {
      console.error('Error fetching topic:', error);
      return res.status(500).send(`Error loading topic: ${error.message}`);
    }
  }
  
  // Original ebook route logic
  if (!userId) {
    return res.status(400).send('User ID or Topic ID is required. Use ?user=123 or ?topicId=xyz');
  }
  
  // Find ebook for the user
  const ebook = ebooksData[userId];
  
  if (!ebook) {
    return res.status(404).send(`No ebook found for user ID: ${userId}`);
  }
  
  // Load user notes from MongoDB (no topicId for regular ebook)
  const notes = await loadUserNotes(userId, null);
  
  res.render('ebook', {
    ebook: ebook,
    userId: userId,
    userNotes: notes,
    isTopic: false
  });
});

// API endpoint to get ebook data as JSON (for React Native WebView)
app.get('/api/ebook', (req, res) => {
  const userId = req.query.user || req.query.id || req.query.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required. Use ?user=123 or ?id=123' });
  }
  
  const ebook = ebooksData[userId];
  
  if (!ebook) {
    return res.status(404).json({ error: `No ebook found for user ID: ${userId}` });
  }
  
  res.json(ebook);
});

// API endpoint to get user notes
app.get('/api/user-notes', async (req, res) => {
  const userId = req.query.user || req.query.id || req.query.userId;
  const topicId = req.query.topicId || req.query.topic;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  const notes = await loadUserNotes(userId, topicId);
  
  res.json({ userId, topicId: topicId || null, notes });
});

// API endpoint to save user notes
app.post('/api/user-notes', async (req, res) => {
  const userId = req.query.user || req.query.id || req.query.userId || req.body.userId;
  const topicId = req.query.topicId || req.query.topic || req.body.topicId;
  const notes = req.body.notes;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  if (!Array.isArray(notes)) {
    return res.status(400).json({ error: 'Notes must be an array' });
  }
  
  const success = await saveUserNotes(notes, userId, topicId);
  
  if (success) {
    res.json({ success: true, message: 'Notes saved successfully' });
  } else {
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// Start the server only after database connection is established
const startServer = async () => {
  try {
    // Wait for database connection
    await connectDB();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Ebook viewer: http://localhost:${PORT}/ebook?user=123`);
      console.log(`API endpoint: http://localhost:${PORT}/api/ebook?user=123`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

