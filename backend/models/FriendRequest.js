const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Prevent duplicate requests between two users
friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.model('FriendRequest', friendRequestSchema);
