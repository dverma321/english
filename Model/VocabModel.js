const mongoose = require('mongoose');

// Define schema
const wordSchema = new mongoose.Schema({
  word: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  hindiMeaning: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create model
const Word = mongoose.model('Word', wordSchema);

module.exports = Word;
