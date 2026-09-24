const mongoose = require('mongoose');

const teamReminderInvitationSchema = new mongoose.Schema({
  reminder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reminder',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('TeamReminderInvitation', teamReminderInvitationSchema);
