const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  reminder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reminder',
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Comment', commentSchema);
