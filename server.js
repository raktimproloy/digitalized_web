require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

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

// Helper function to load user notes
function loadUserNotes() {
  try {
    const notesFile = path.join(__dirname, 'data', 'user-notes.json');
    if (fs.existsSync(notesFile)) {
      const fileContent = fs.readFileSync(notesFile, 'utf8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.error('Error loading user notes:', error);
  }
  return {};
}

// Helper function to save user notes
function saveUserNotes(notesData) {
  try {
    const notesFile = path.join(__dirname, 'data', 'user-notes.json');
    fs.writeFileSync(notesFile, JSON.stringify(notesData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving user notes:', error);
    return false;
  }
}

// Ebook route - accepts user ID as query parameter
app.get('/ebook', (req, res) => {
  const userId = req.query.user || req.query.id || req.query.userId;
  
  if (!userId) {
    return res.status(400).send('User ID is required. Use ?user=123 or ?id=123');
  }
  
  // Find ebook for the user
  const ebook = ebooksData[userId];
  
  if (!ebook) {
    return res.status(404).send(`No ebook found for user ID: ${userId}`);
  }
  
  // Load user notes
  const userNotes = loadUserNotes();
  const notes = userNotes[userId] || [];
  
  res.render('ebook', {
    ebook: ebook,
    userId: userId,
    userNotes: notes
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
app.get('/api/user-notes', (req, res) => {
  const userId = req.query.user || req.query.id || req.query.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  const userNotes = loadUserNotes();
  const notes = userNotes[userId] || [];
  
  res.json({ userId, notes });
});

// API endpoint to save user notes
app.post('/api/user-notes', (req, res) => {
  const userId = req.query.user || req.query.id || req.query.userId || req.body.userId;
  const notes = req.body.notes;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  if (!Array.isArray(notes)) {
    return res.status(400).json({ error: 'Notes must be an array' });
  }
  
  const userNotes = loadUserNotes();
  userNotes[userId] = notes;
  
  if (saveUserNotes(userNotes)) {
    res.json({ success: true, message: 'Notes saved successfully' });
  } else {
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Ebook viewer: http://localhost:${PORT}/ebook?user=123`);
  console.log(`API endpoint: http://localhost:${PORT}/api/ebook?user=123`);
});

