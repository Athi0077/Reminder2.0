const mongoose = require('mongoose');

const eventMemberSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reminder',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member'
  }
}, {
  timestamps: true
});

// Ensure a user can only have one role/record per event
eventMemberSchema.index({ eventId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('EventMember', eventMemberSchema);
