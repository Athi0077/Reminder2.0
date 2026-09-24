const mongoose = require('mongoose');

const pollOptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  votes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

const eventPollSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reminder',
    required: true,
    index: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: [pollOptionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isClosed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EventPoll', eventPollSchema);
