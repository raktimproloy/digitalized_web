const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb+srv://sudiptolaskar01_db_user:PpjUe65ObYjsqs7b@cluster0.rzy7de9.mongodb.net/chorcha?appName=Cluster0'
    );

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

