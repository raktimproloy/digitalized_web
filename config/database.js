const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Don't reconnect if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }

    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb+srv://sudiptolaskar01_db_user:PpjUe65ObYjsqs7b@cluster0.rzy7de9.mongodb.net/chorcha?appName=Cluster0'
    );

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error; // Re-throw so server doesn't start if connection fails
  }
};

module.exports = connectDB;

