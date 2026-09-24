const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  type: {
    type: String,
    enum: ['friend_request', 'friend_accepted', 'reminder_shared', 'reminder_updated', 'reminder_completed', 'team_invitation'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Notification', notificationSchema);
