const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  type: {
    type: String,
    enum: ['personal', 'team'],
    default: 'personal',
  },
  joinSettings: {
    type: String,
    enum: ['ANYONE', 'APPROVAL', 'INVITE_ONLY'],
    default: 'INVITE_ONLY'
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
      default: 'none'
    },
    interval: {
      type: Number,
      default: 1 // e.g. every 1 week, every 2 weeks
    },
    daysOfWeek: [{
      type: Number, // 0 = Sunday, 1 = Monday, etc.
      min: 0,
      max: 6
    }],
    endDate: {
      type: Date
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Please add a text value'],
  },
  description: {
    type: String,
  },
  dateTime: {
    type: Date,
    required: [true, 'Please add a date and time'],
    index: true,
  },
  location: {
    type: String,
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  reminderTime: {
    type: Number, // Minutes before event
    default: 15,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  alarm: {
    enabled: { type: Boolean, default: true },
    sound: { type: String, default: 'default' },
    snoozeMinutes: { type: Number, default: 5 }
  },
  nextAlarmAt: {
    type: Date,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'triggered', 'completed', 'dismissed'],
    default: 'pending',
    index: true
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Reminder', reminderSchema);
