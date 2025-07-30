const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI ? process.env.MONGO_URI.trim().replace(/^"|"$/g, '') : 'mongodb://localhost:27017/ai-scheduling';
    console.log('Attempting to connect to MongoDB with URI:', mongoURI);
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;