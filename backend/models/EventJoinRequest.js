const mongoose = require('mongoose');

const eventJoinRequestSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reminder',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
    default: 'PENDING'
  },
  respondedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Ensure a user can only have one pending request per event
eventJoinRequestSchema.index({ eventId: 1, userId: 1, status: 1 });

module.exports = mongoose.model('EventJoinRequest', eventJoinRequestSchema);
