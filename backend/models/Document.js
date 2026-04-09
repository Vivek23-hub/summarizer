const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
  },
  extractedText: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional because guest users can also use it
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Document', DocumentSchema);
