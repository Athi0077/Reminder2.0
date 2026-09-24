const mongoose = require('mongoose');

const eventLogSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reminder',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actionType: {
    type: String,
    enum: [
      'EVENT_CREATED', 
      'EVENT_UPDATED',
      'MEMBER_JOINED', 
      'MEMBER_LEFT', 
      'MEMBER_REMOVED', 
      'ROLE_CHANGED',
      'TASK_CREATED',
      'TASK_UPDATED',
      'TASK_COMPLETED',
      'TASK_DELETED'
    ],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EventLog', eventLogSchema);
